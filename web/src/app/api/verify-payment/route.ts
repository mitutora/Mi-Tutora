import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const adminAuth = await getAdminAuth();
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      useWallet = false
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification parameters' }, { status: 400 });
    }

    // LIVE MODE: Cryptographic Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Razorpay secret is not configured.' }, { status: 500 });
    }

    // The signature is essentially an HMAC SHA256 of "order_id|payment_id"
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const paymentsRef = adminDb.collection('payments');
    const q = paymentsRef.where('razorpayOrderId', '==', razorpay_order_id).limit(1);
    const snap = await q.get();

    if (generated_signature !== razorpay_signature) {
      // Log failed attempt
      if (!snap.empty) {
        await snap.docs[0].ref.update({ status: 'failed', updatedAt: new Date() });
      }
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    if (snap.empty) {
      return NextResponse.json({ error: 'Order ID not found in secure ledger.' }, { status: 404 });
    }

    const paymentDoc = snap.docs[0];
    const paymentDocRef = paymentDoc.ref;
    const initialData = paymentDoc.data();

    // Secure ownership: Ensure the user verifying the payment owns the ledger record
    if (initialData.userId && initialData.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized: Payment does not belong to this user' }, { status: 403 });
    }

    // Prevent Replay Attacks & Concurrency Race Conditions via Firestore Transaction Lock
    let paymentData: any = initialData;
    let alreadyPaid = false;

    await adminDb.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(paymentDocRef);
      if (!freshSnap.exists) {
        throw new Error('Order ID not found in secure ledger.');
      }
      const freshData = freshSnap.data() || {};
      if (freshData.status === 'paid') {
        alreadyPaid = true;
        paymentData = freshData;
        return;
      }

      // Atomically claim lock and mark as paid so concurrent requests immediately exit
      transaction.update(paymentDocRef, {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        verifiedVia: 'client',
        verifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      paymentData = freshData;
    });

    if (alreadyPaid) {
      return NextResponse.json({ success: true, message: 'Payment already verified' });
    }

    // SECURE: Strictly derive application ID, role, and removal flag from ledger record
    const verifiedApplicationId = paymentData.applicationDocId;
    if (!verifiedApplicationId) {
      return NextResponse.json({ error: 'No application associated with this payment order.' }, { status: 400 });
    }

    const verifiedRole = paymentData.type === 'demo' ? 'teacher' : 'student';
    const verifiedIsRemoval = Boolean(paymentData.isRemoval);
    const appRef = adminDb.collection('applications').doc(verifiedApplicationId);

    // Payment is 100% authentic. Perform secure backend database update.
    await processDatabaseUpdate(adminDb, appRef, verifiedApplicationId, verifiedRole, verifiedIsRemoval, razorpay_order_id, razorpay_payment_id, useWallet);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify payment' }, { status: 500 });
  }
}

// Reusable function to handle the complex DB logic that the frontend used to do
async function processDatabaseUpdate(adminDb: any, appRef: any, applicationId: string, role: string, isRemoval: boolean, orderId: string, paymentId: string, useWallet: boolean) {
    const batch = adminDb.batch();
    
    // 1. Verify ledger record exists
    const paymentsRef = adminDb.collection('payments');
    const q = paymentsRef.where('razorpayOrderId', '==', orderId).limit(1);
    const snap = await q.get();
    
    if (snap.empty) {
        // SECURITY PATCH: Do not blindly accept unknown order IDs
        throw new Error("Order ID not found in secure ledger. Payment rejected.");
    }

    // Fetch app data to execute logic
    const appSnap = await appRef.get();
    const appData = appSnap.data();
    if (!appData) throw new Error("Application data missing");

    // 2. Handle Wallet Deductions Securely
    const paymentData = snap.docs[0].data();
    if (paymentData.walletDiscountApplied > 0) {
        const userId = role === 'student' ? appData?.parentDocId : appData?.tutorDocId;
        
        if (userId) {
            batch.update(adminDb.collection('users').doc(userId), {
                walletBalance: FieldValue.increment(-paymentData.walletDiscountApplied)
            });
        }
    }

    // 3. Update the Application Document securely (bypassing the rules)
    if (role === 'student') {
        if (isRemoval) {
            batch.update(appRef, {
                status: 'declined',
                feePaid: true,
                cancellationRequested: false,
                updatedAt: Date.now()
            });
        } else {
            batch.update(appRef, {
                status: 'tuition_started',
                feePaid: true,
                updatedAt: Date.now()
            });

            // Mark tracker as paid
            const pendingFeeRef = adminDb.collection('pending_tuition_fees').doc(applicationId);
            batch.set(pendingFeeRef, {
                status: 'paid',
                paidAt: FieldValue.serverTimestamp()
            }, { merge: true });

            // Financial Split Math: 40% Platform Commission, 60% Tutor Share, 25% of Cut for Referrals
            const rewardBase = appData.finalPrice || appData.currentOffer || appData.budget || 4000;
            const platformFee = Math.round(rewardBase * 0.40);
            const tutorShare = Math.round(rewardBase * 0.60);
            const rewardAmount = Math.round(platformFee * 0.25);

            // Fetch Tutor UPI if saved on profile
            let tutorUpi = '';
            if (appData.tutorDocId) {
                try {
                    const tutorDocSnap = await adminDb.collection('tutors').doc(appData.tutorDocId).get();
                    if (tutorDocSnap.exists) {
                        tutorUpi = tutorDocSnap.data()?.upiId || '';
                    }
                } catch (tutorErr) {
                    console.error('Could not fetch tutor UPI during escrow creation:', tutorErr);
                }
            }

            // Calculate Day 30 release timestamp
            const startMs = appData.startDate 
                ? (typeof appData.startDate.toMillis === 'function' ? appData.startDate.toMillis() : (typeof appData.startDate === 'number' ? appData.startDate : Date.now())) 
                : Date.now();
            const releaseEligibleAt = startMs + (30 * 24 * 60 * 60 * 1000);

            // Create Escrow Record in 'tutor_payouts' with deterministic document ID
            const payoutRef = adminDb.collection('tutor_payouts').doc(`payout_${applicationId}`);
            batch.set(payoutRef, {
                payoutDocId: payoutRef.id,
                applicationDocId: applicationId,
                studentPaymentId: paymentId,
                tutorDocId: appData.tutorDocId || '',
                tutorName: appData.tutorName || '',
                parentDocId: appData.parentDocId || '',
                grossAmount: rewardBase,
                platformFeeRate: 0.40,
                platformFeeAmount: platformFee,
                tutorShareRate: 0.60,
                tutorShareAmount: tutorShare,
                referralReward: rewardAmount,
                monthNumber: 1,
                status: 'escrow_held',
                startDate: appData.startDate || FieldValue.serverTimestamp(),
                paidByStudentAt: FieldValue.serverTimestamp(),
                releaseEligibleAt: releaseEligibleAt,
                payoutMethod: 'upi',
                payoutVpa: tutorUpi,
                razorpayPayoutId: '',
                utrNumber: '',
                createdAt: FieldValue.serverTimestamp(),
                paidAt: null
            }, { merge: true });

            // Process Referrals on full payment (funded out of 40% platform cut)
            try {
                const studentUid = appData.parentDocId;
                const teacherUid = appData.tutorDocId;

                const processReferral = async (referredUid: string) => {
                    if (!referredUid) return;
                    const refSnap = await adminDb.collection('referrals')
                        .where('referredUserId', '==', referredUid)
                        .where('status', '==', 'pending')
                        .get();
                    
                    if (!refSnap.empty) {
                        const refDoc = refSnap.docs[0];
                        const refData = refDoc.data();
                        const referrerId = refData.referrerId;

                        // Idempotency guard: skip if this referral has already been processed (e.g. on a retry)
                        if (refData.status !== 'pending') return;

                        if (refData.referralType === 'teacher') {
                            batch.update(adminDb.collection('referrals').doc(refDoc.id), {
                                status: 'qualified',
                                reward: 0,
                                rewardType: 'banked_token',
                                qualifiedAt: FieldValue.serverTimestamp()
                            });
                            batch.update(adminDb.collection('tutors').doc(referrerId), {
                                bankedTokens: FieldValue.increment(1)
                            });
                        } else {
                            // Referrer Reward (Student or Teacher referring a student): Lock into Day 30 automated escrow
                            let referrerUpi = '';
                            try {
                                const userSnap = await adminDb.collection('users').doc(referrerId).get();
                                if (userSnap.exists) {
                                    referrerUpi = userSnap.data()?.upiId || '';
                                }
                                if (!referrerUpi) {
                                    const tutorSnap = await adminDb.collection('tutors').doc(referrerId).get();
                                    if (tutorSnap.exists) {
                                        referrerUpi = tutorSnap.data()?.upiId || '';
                                    }
                                }
                            } catch (uErr) {
                                console.error('Could not fetch referrer UPI:', uErr);
                            }

                            batch.update(adminDb.collection('referrals').doc(refDoc.id), {
                                status: 'qualified',
                                reward: rewardAmount,
                                rewardType: 'wallet_cash',
                                qualifiedAt: FieldValue.serverTimestamp(),
                                payoutStatus: 'escrow_held',
                                releaseEligibleAt: releaseEligibleAt,
                                payoutVpa: referrerUpi,
                                razorpayPayoutId: '',
                                utrNumber: '',
                                paidAt: null
                            });
                            batch.update(adminDb.collection('users').doc(referrerId), {
                                walletBalance: FieldValue.increment(rewardAmount)
                            });
                        }
                    }
                };

                await Promise.all([
                    processReferral(studentUid),
                    processReferral(teacherUid)
                ]);
            } catch (rewardErr) {
                console.error('Failed to process referral rewards in payment verification:', rewardErr);
            }
            
            // Auto-decline competing apps logic for this specific group/student
            const qGroupId = appData.groupDocId || appData.studentDocId;
            if (qGroupId) {
                const query1 = adminDb.collection('applications').where('groupDocId', '==', qGroupId);
                const query2 = adminDb.collection('applications').where('studentDocId', '==', qGroupId);
                
                const [snap1, snap2] = await Promise.all([query1.get(), query2.get()]);
                const docsToProcess = new Map();
                snap1.docs.forEach((d: any) => docsToProcess.set(d.id, d));
                snap2.docs.forEach((d: any) => docsToProcess.set(d.id, d));
                
                for (const [docId, docSnap] of Array.from(docsToProcess.entries())) {
                     if (docId !== applicationId && docSnap.data().status !== 'declined' && docSnap.data().status !== 'tuition_started') {
                        batch.update(adminDb.collection('applications').doc(docId), {
                            status: 'declined',
                            updatedAt: FieldValue.serverTimestamp()
                        });
                        
                        const d = docSnap.data();
                        if (d.tutorDocId) {
                            batch.update(adminDb.collection('tutors').doc(d.tutorDocId), { 
                                pendingRequests: FieldValue.arrayRemove(docId) 
                            });
                        }
                     }
                }
            }
        }
    } else if (role === 'teacher') {
        batch.update(appRef, {
            status: 'demo_booking_phase',
            demoPaymentPaid: true,
            updatedAt: Date.now()
        });
    }

    await batch.commit();
}
