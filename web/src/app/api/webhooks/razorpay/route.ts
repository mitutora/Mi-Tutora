import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/utils/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Server-to-server Razorpay Webhook Handler for Next.js App Router.
 * Validates HMAC SHA256 signature and idempotently marks payment as paid,
 * updating application status and generating Day 30 escrow held records.
 */
export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const webhookSignature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!webhookSecret) {
      console.error('[RazorpayWebhook] RAZORPAY_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
    }

    // 1. Read Raw Body and Verify Cryptographic HMAC SHA256 Signature
    const rawBody = await req.text();
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      console.warn('[RazorpayWebhook] Invalid webhook signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const event = payload?.event;
    console.log(`[RazorpayWebhook] Received verified event: ${event}`);

    // Only process payment captured or order paid events
    if (event !== 'order.paid' && event !== 'payment.captured') {
      return NextResponse.json({ status: 'ignored', event });
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id || payload?.payload?.order?.entity?.id;
    const paymentId = paymentEntity?.id;

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: 'Missing order_id or payment_id in payload' }, { status: 400 });
    }

    // 2. Query Payment Record in Ledger
    const paymentsRef = adminDb.collection('payments');
    const snap = await paymentsRef.where('razorpayOrderId', '==', orderId).limit(1).get();

    if (snap.empty) {
      console.warn(`[RazorpayWebhook] Order ${orderId} not found in payments ledger.`);
      return NextResponse.json({ status: 'order_not_found_in_ledger', orderId });
    }

    const paymentDocRef = snap.docs[0].ref;

    // 3. Atomically Lock & Update Ledger and Escrows using Firestore runTransaction
    let alreadyPaid = false;
    await adminDb.runTransaction(async (transaction) => {
      const pSnap = await transaction.get(paymentDocRef);
      if (!pSnap.exists) return;

      const pData = pSnap.data() || {};
      if (pData.status === 'paid') {
        alreadyPaid = true;
        return;
      }

      // Mark payment ledger record as paid
      transaction.update(paymentDocRef, {
        status: 'paid',
        razorpayPaymentId: paymentId,
        verifiedVia: 'webhook',
        verifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const applicationId = pData.applicationDocId;
      if (!applicationId) return;

      const appRef = adminDb.collection('applications').doc(applicationId);
      const appSnap = await transaction.get(appRef);

      if (!appSnap.exists) return;
      const appData = appSnap.data() || {};
      const isRemoval = Boolean(pData.isRemoval);

      if (pData.type === 'demo') {
        // Teacher demo payment
        transaction.update(appRef, {
          status: 'demo_booking_phase',
          demoPaymentPaid: true,
          updatedAt: Date.now(),
        });
      } else {
        // Student tuition payment
        if (isRemoval) {
          transaction.update(appRef, {
            status: 'declined',
            feePaid: true,
            cancellationRequested: false,
            updatedAt: Date.now(),
          });
        } else {
          transaction.update(appRef, {
            status: 'tuition_started',
            feePaid: true,
            updatedAt: Date.now(),
          });

          // Mark pending fee tracker as paid
          const pendingFeeRef = adminDb.collection('pending_tuition_fees').doc(applicationId);
          transaction.set(
            pendingFeeRef,
            {
              status: 'paid',
              paidAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Escrow calculation: 40% Platform Commission, 60% Tutor Share, 25% of Cut for Referrals
          const rewardBase = appData.finalPrice || appData.currentOffer || appData.budget || 4000;
          const platformFee = Math.round(rewardBase * 0.4);
          const tutorShare = Math.round(rewardBase * 0.6);
          const rewardAmount = Math.round(platformFee * 0.25);

          const startMs = appData.startDate
            ? typeof appData.startDate.toMillis === 'function'
              ? appData.startDate.toMillis()
              : typeof appData.startDate === 'number'
              ? appData.startDate
              : Date.now()
            : Date.now();
          const releaseEligibleAt = startMs + 30 * 24 * 60 * 60 * 1000;

          // Deterministic escrow document ID prevents any duplicate escrow creation
          const payoutRef = adminDb.collection('tutor_payouts').doc(`payout_${applicationId}`);
          transaction.set(
            payoutRef,
            {
              payoutDocId: payoutRef.id,
              applicationDocId: applicationId,
              studentPaymentId: paymentId,
              tutorDocId: appData.tutorDocId || '',
              tutorName: appData.tutorName || '',
              parentDocId: appData.parentDocId || '',
              grossAmount: rewardBase,
              platformFeeRate: 0.4,
              platformFeeAmount: platformFee,
              tutorShareRate: 0.6,
              tutorShareAmount: tutorShare,
              referralReward: rewardAmount,
              monthNumber: 1,
              status: 'escrow_held',
              startDate: appData.startDate || FieldValue.serverTimestamp(),
              paidByStudentAt: FieldValue.serverTimestamp(),
              releaseEligibleAt,
              payoutMethod: 'upi',
              payoutVpa: '',
              razorpayPayoutId: '',
              utrNumber: '',
              createdAt: FieldValue.serverTimestamp(),
              paidAt: null,
            },
            { merge: true }
          );
        }
      }
    });

    return NextResponse.json({
      status: alreadyPaid ? 'already_processed' : 'success',
      orderId,
    });
  } catch (error: any) {
    console.error('[RazorpayWebhook] Webhook processing error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
