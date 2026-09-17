import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb, getAdminAuth } from '@/utils/firebase/admin';
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
      razorpay_signature
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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

    // Secure ownership: Ensure the user verifying the payment is the intended subscriber
    const verifiedUserId = initialData.userId;
    if (verifiedUserId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized: Subscription does not belong to this user' }, { status: 403 });
    }

    // Prevent Replay Attacks & Concurrency Race Conditions via Firestore Transaction Lock
    // (same atomic pattern used in verify-payment/route.ts)
    let alreadyPaid = false;
    await adminDb.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(paymentDocRef);
      if (!freshSnap.exists) {
        throw new Error('Order ID not found in secure ledger.');
      }
      const freshData = freshSnap.data() || {};
      if (freshData.status === 'paid') {
        alreadyPaid = true;
        return;
      }
      // Atomically claim the lock — concurrent requests exit immediately on the status check
      transaction.update(paymentDocRef, {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        verifiedVia: 'client',
        verifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    if (alreadyPaid) {
      return NextResponse.json({ success: true, message: 'Subscription already verified' });
    }

    // Payment is 100% authentic. Perform secure backend database update.
    await processSubscriptionUpdate(adminDb, verifiedUserId, razorpay_order_id, razorpay_payment_id);

    return NextResponse.json({ success: true });


  } catch (error: any) {
    console.error('Error verifying subscription payment:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify subscription payment' }, { status: 500 });
  }
}

async function processSubscriptionUpdate(adminDb: any, userId: string, orderId: string, paymentId: string) {
    const batch = adminDb.batch();
    
    // 1. Update the ledger
    const paymentsRef = adminDb.collection('payments');
    const q = paymentsRef.where('razorpayOrderId', '==', orderId).limit(1);
    const snap = await q.get();
    
    if (!snap.empty) {
        batch.update(snap.docs[0].ref, {
            status: 'paid',
            razorpayPaymentId: paymentId,
            updatedAt: new Date()
        });
    } else {
        throw new Error("Order ID not found in secure ledger. Payment rejected.");
    }

    // 2. Update the Tutor Document
    const tutorRef = adminDb.collection('tutors').doc(userId);
    const tutorSnap = await tutorRef.get();
    
    if (!tutorSnap.exists) {
        throw new Error("Tutor profile not found.");
    }

    const tutorData = tutorSnap.data() || {};
    
    // Use calendar month arithmetic (not flat 30 days) to handle months of varying lengths correctly
    const now = Date.now();
    const currentExpiry = tutorData.subscriptionExpiry || 0;
    const baseDate = new Date(Math.max(now, currentExpiry));
    baseDate.setMonth(baseDate.getMonth() + 1);
    const expiryDate = baseDate.getTime();

    const currentTokensUsed = tutorData.weeklyQuota?.tokensUsed || 0;
    const updatedTokensUsed = Math.max(0, currentTokensUsed - 10);

    batch.update(tutorRef, {
        subscriptionPlan: 'pro',
        isSubscribed: true,
        subscriptionExpiry: expiryDate,
        subscriptionUpdatedAt: FieldValue.serverTimestamp(),
        'weeklyQuota.tokensUsed': updatedTokensUsed,
        'weeklyQuota.lastUpdated': FieldValue.serverTimestamp()
    });

    await batch.commit();
}
