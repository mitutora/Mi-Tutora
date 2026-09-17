import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

/**
 * Helper class to safely chunk Firestore operations into sub-400 batches,
 * completely avoiding the 500-operation limit.
 */
class BatchManager {
  private db: admin.firestore.Firestore;
  private currentBatch: admin.firestore.WriteBatch;
  public totalOperations = 0;
  private currentBatchCount = 0;
  private readonly MAX_BATCH = 400;

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
    this.currentBatch = db.batch();
  }

  async update(ref: admin.firestore.DocumentReference, data: any) {
    this.currentBatch.update(ref, data);
    this.currentBatchCount++;
    this.totalOperations++;

    if (this.currentBatchCount >= this.MAX_BATCH) {
      await this.currentBatch.commit();
      this.currentBatch = this.db.batch();
      this.currentBatchCount = 0;
    }
  }

  async commitRemaining() {
    if (this.currentBatchCount > 0) {
      await this.currentBatch.commit();
      this.currentBatchCount = 0;
    }
  }
}

/**
 * Scheduled Cloud Function running every night at 00:00 IST (Indian Standard Time).
 * Scans Day 30 unlocked escrow records and executes automated disbursements.
 */
export const processDailyPayouts = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Kolkata",
    retryCount: 3,
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const batchManager = new BatchManager(db);

    console.log(`[processDailyPayouts] Initiating automated Day 30 escrow scan at ${new Date().toISOString()}`);

    // 1. Scan and process tutor payouts (60% share)
    const tutorSnap = await db
      .collection("tutor_payouts")
      .where("status", "in", ["escrow_held", "action_required_missing_upi"])
      .get();

    for (const docSnap of tutorSnap.docs) {
      const payout = docSnap.data();
      const releaseEligibleAt = payout.releaseEligibleAt || 0;

      // STRICT SAFETY GUARD: Payout only processes if student has verified paid their tuition fee
      if (!payout.studentPaymentId || !payout.paidByStudentAt) {
        console.warn(`[processDailyPayouts] Skipping tutor payout ${docSnap.id}: student payment verification missing.`);
        continue;
      }

      if (now < releaseEligibleAt) continue;

      let targetVpa = payout.payoutVpa || "";
      if (!targetVpa && payout.tutorDocId) {
        const tutorProfile = await db.collection("tutors").doc(payout.tutorDocId).get();
        if (tutorProfile.exists) {
          targetVpa = tutorProfile.data()?.upiId || "";
        }
      }

      if (!targetVpa) {
        await batchManager.update(docSnap.ref, {
          status: "action_required_missing_upi",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await batchManager.update(docSnap.ref, {
          status: "ready_for_payout",
          payoutVpa: targetVpa,
          unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // 2. Scan and process student referral rewards (10% gross / 25% margin)
    const referralSnap = await db
      .collection("referrals")
      .where("status", "==", "qualified")
      .where("rewardType", "==", "wallet_cash")
      .where("payoutStatus", "in", ["escrow_held", "action_required_missing_upi"])
      .get();

    for (const refSnap of referralSnap.docs) {
      const refData = refSnap.data();
      const releaseEligibleAt = refData.releaseEligibleAt || 0;
      const reward = refData.reward || 0;

      if (reward <= 0 || now < releaseEligibleAt) continue;

      // STRICT SAFETY GUARD: Referral reward only processes if qualified via verified payment
      if (refData.status !== "qualified" || !refData.qualifiedAt) {
        console.warn(`[processDailyPayouts] Skipping referral payout ${refSnap.id}: student fee payment qualification missing.`);
        continue;
      }

      let targetVpa = refData.payoutVpa || "";
      if (!targetVpa && refData.referrerId) {
        const userSnap = await db.collection("users").doc(refData.referrerId).get();
        if (userSnap.exists) {
          targetVpa = userSnap.data()?.upiId || "";
        }
      }

      if (!targetVpa) {
        await batchManager.update(refSnap.ref, {
          payoutStatus: "action_required_missing_upi",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await batchManager.update(refSnap.ref, {
          payoutStatus: "ready_for_payout",
          payoutVpa: targetVpa,
          unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batchManager.commitRemaining();
    console.log(`[processDailyPayouts] Finished processing ${batchManager.totalOperations} escrow updates.`);

    // 3. Manual Payout Mode: Automated API runner dispatch is disabled.
    // Escrows have been safely transitioned to 'ready_for_payout' above
    // and can be viewed and fulfilled manually in the Admin Dashboard.
    console.log("[processDailyPayouts] Manual payout mode active: Escrows unlocked and awaiting manual fulfillment.");
  }
);
