import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

/**
 * Scheduled Cloud Function running every Monday at 00:00 IST.
 * Formally resets and anchors the weekStartDate for weekly token quotas.
 */
export const resetWeeklyTeacherQuotas = onSchedule(
  {
    schedule: "0 0 * * 1", // Midnight every Monday
    timeZone: "Asia/Kolkata",
    retryCount: 2,
  },
  async () => {
    const db = admin.firestore();
    const d = new Date();
    // Monday date string in YYYY-MM-DD
    const currentWeekStart = d.toISOString().split("T")[0];

    console.log(`[resetWeeklyTeacherQuotas] Commencing Monday weekly quota rollover for week ${currentWeekStart}`);

    // Update in chunks of 400
    const tutorsSnap = await db.collection("tutors").get();
    let batch = db.batch();
    let count = 0;

    for (const doc of tutorsSnap.docs) {
      batch.update(doc.ref, {
        "weeklyQuota.weekStartDate": currentWeekStart,
        "weeklyQuota.tokensUsed": 0,
        "weeklyQuota.lastReset": admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;

      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }

    if (count % 400 !== 0) {
      await batch.commit();
    }

    console.log(`[resetWeeklyTeacherQuotas] Successfully initialized quotas for ${count} tutors.`);
  }
);
