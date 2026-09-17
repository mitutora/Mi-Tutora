import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_BATCH_SIZE = 400;

/**
 * Scheduled Cloud Function running every hour.
 * 1. Checks applications in 'waiting_for_parent_decision' older than 48 hours and marks them 'declined'.
 * 2. Checks uncompleted demos in 'demo_scheduled' older than 24 hours past scheduled time and transitions to 'waiting_for_parent_decision'.
 */
export const expireDemosAndDecisions = onSchedule(
  {
    schedule: "0 * * * *", // Every hour
    timeZone: "Asia/Kolkata",
    retryCount: 2,
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();

    let batch = db.batch();
    let opCount = 0;

    const commitBatchIfNeeded = async () => {
      if (opCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    };

    // 1. Auto-transition demo_scheduled older than 24h past scheduled time to waiting_for_parent_decision
    const scheduledSnap = await db
      .collection("applications")
      .where("status", "==", "demo_scheduled")
      .get();

    for (const docSnap of scheduledSnap.docs) {
      const app = docSnap.data();
      if (!app.demoDate || !app.demoTime) continue;

      const cleanTime = (app.demoTime || "").split("||")[0].trim();
      const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
      const demoTimeMs = new Date(`${app.demoDate}T${formattedTime}+05:30`).getTime();

      if (!isNaN(demoTimeMs) && now - demoTimeMs > TWENTY_FOUR_HOURS_MS) {
        batch.update(docSnap.ref, {
          status: "waiting_for_parent_decision",
          demoCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        opCount++;
        await commitBatchIfNeeded();
      }
    }

    // 2. Auto-decline waiting_for_parent_decision older than 48h
    const pendingSnap = await db
      .collection("applications")
      .where("status", "==", "waiting_for_parent_decision")
      .get();

    let expiredCount = 0;

    for (const docSnap of pendingSnap.docs) {
      const app = docSnap.data();
      const completedTime =
        app.demoCompletedAt?.toMillis?.() ||
        app.updatedAt?.toMillis?.() ||
        app.demoCompletedAt ||
        app.updatedAt ||
        0;

      // Check if 48 hours have elapsed
      if (completedTime > 0 && now - completedTime > FORTY_EIGHT_HOURS_MS) {
        expiredCount++;

        // Mark application as declined
        batch.update(docSnap.ref, {
          status: "declined",
          reason: "parent_48h_decision_window_elapsed",
          declinedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiredReason: "parent_48h_decision_window_elapsed",
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        opCount++;
        await commitBatchIfNeeded();

        // Free up teacher pending slot
        if (app.tutorDocId) {
          batch.update(db.collection("tutors").doc(app.tutorDocId), {
            pendingRequests: admin.firestore.FieldValue.arrayRemove(docSnap.id),
          });
          opCount++;
          await commitBatchIfNeeded();
        }

        // Free up student pending slots
        const studentIds = app.studentDocIds || (app.studentDocId ? [app.studentDocId] : []);
        for (const sid of studentIds) {
          batch.update(db.collection("students").doc(sid), {
            pendingRequests: admin.firestore.FieldValue.arrayRemove(docSnap.id),
          });
          opCount++;
          await commitBatchIfNeeded();
        }
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    console.log(`[expireDemosAndDecisions] Processed demo lifecycle: ${expiredCount} expired to declined.`);
  }
);
