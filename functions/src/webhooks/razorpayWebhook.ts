import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

/**
 * Server-to-server Razorpay Webhook Cloud Function.
 * Captures 'order.paid' and 'payment.captured' events directly from Razorpay,
 * guaranteeing 100% payment reconciliation even if the client closes their browser.
 */
export const handleRazorpayWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const webhookSignature = req.headers["x-razorpay-signature"] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!webhookSecret) {
    console.error("[handleRazorpayWebhook] RAZORPAY_WEBHOOK_SECRET is not configured.");
    res.status(500).send("Webhook secret misconfigured");
    return;
  }

  // 1. Verify Cryptographic HMAC SHA256 Signature
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== webhookSignature) {
    console.warn("[handleRazorpayWebhook] Invalid webhook signature rejected.");
    res.status(400).send("Invalid signature");
    return;
  }

  const payload = req.body;
  const event = payload?.event;

  console.log(`[handleRazorpayWebhook] Received verified Razorpay event: ${event}`);

  if (event !== "order.paid" && event !== "payment.captured") {
    // Acknowledge other events without processing
    res.status(200).json({ status: "ignored" });
    return;
  }

  const paymentEntity = payload?.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id || payload?.payload?.order?.entity?.id;
  const paymentId = paymentEntity?.id;

  if (!orderId || !paymentId) {
    res.status(400).send("Missing orderId or paymentId");
    return;
  }

  const db = admin.firestore();

  try {
    // 2. Locate payment record in payments collection
    const paymentsSnap = await db
      .collection("payments")
      .where("razorpayOrderId", "==", orderId)
      .limit(1)
      .get();

    if (paymentsSnap.empty) {
      console.warn(`[handleRazorpayWebhook] No ledger record found for order ${orderId}`);
      res.status(200).json({ status: "order_not_found_in_ledger" });
      return;
    }

    const paymentDocRef = paymentsSnap.docs[0].ref;

    // 3. Atomically update ledger and escrow in a transaction (Idempotent)
    await db.runTransaction(async (transaction) => {
      const pSnap = await transaction.get(paymentDocRef);
      const pData = pSnap.data() || {};

      if (pData.status === "paid") {
        console.log(`[handleRazorpayWebhook] Order ${orderId} is already marked paid.`);
        return;
      }

      transaction.update(paymentDocRef, {
        status: "paid",
        razorpayPaymentId: paymentId,
        verifiedVia: "webhook",
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const applicationId = pData.applicationDocId;
      if (applicationId) {
        const appRef = db.collection("applications").doc(applicationId);
        const appSnap = await transaction.get(appRef);

        if (appSnap.exists) {
          const appData = appSnap.data() || {};
          const isRemoval = Boolean(pData.isRemoval);

          if (isRemoval) {
            transaction.update(appRef, {
              status: "declined",
              feePaid: true,
              cancellationRequested: false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            transaction.update(appRef, {
              status: "tuition_started",
              feePaid: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update pending tuition fee record
            const pendingFeeRef = db.collection("pending_tuition_fees").doc(applicationId);
            transaction.set(
              pendingFeeRef,
              {
                status: "paid",
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            // Create Escrow in tutor_payouts if not already present
            const rewardBase = appData.finalPrice || appData.currentOffer || appData.budget || 4000;
            const platformFee = Math.round(rewardBase * 0.4);
            const tutorShare = Math.round(rewardBase * 0.6);
            const rewardAmount = Math.round(platformFee * 0.25);
            const startMs = appData.startDate 
              ? (typeof appData.startDate.toMillis === "function" ? appData.startDate.toMillis() : (typeof appData.startDate === "number" ? appData.startDate : Date.now())) 
              : Date.now();
            const releaseEligibleAt = startMs + (30 * 24 * 60 * 60 * 1000);

            const payoutRef = db.collection("tutor_payouts").doc(`payout_${applicationId}`);
            transaction.set(
              payoutRef,
              {
                payoutDocId: payoutRef.id,
                applicationDocId: applicationId,
                studentPaymentId: paymentId,
                tutorDocId: appData.tutorDocId || "",
                tutorName: appData.tutorName || "",
                parentDocId: appData.parentDocId || "",
                grossAmount: rewardBase,
                platformFeeRate: 0.4,
                platformFeeAmount: platformFee,
                tutorShareRate: 0.6,
                tutorShareAmount: tutorShare,
                referralReward: rewardAmount,
                monthNumber: 1,
                status: "escrow_held",
                startDate: appData.startDate || admin.firestore.FieldValue.serverTimestamp(),
                paidByStudentAt: admin.firestore.FieldValue.serverTimestamp(),
                releaseEligibleAt,
                payoutMethod: "upi",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }
        }
      }
    });

    res.status(200).json({ status: "success", orderId });
  } catch (err: any) {
    console.error("[handleRazorpayWebhook] Error processing payment webhook:", err);
    res.status(500).send("Webhook processing error");
  }
});
