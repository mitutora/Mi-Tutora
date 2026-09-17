import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Event-driven Cloud Function triggered whenever an application document is created, updated, or deleted.
 * Enforces referential integrity, cleans up pending request arrays, and auto-declines competing applications.
 */
export const onApplicationWritten = onDocumentWritten("applications/{appId}", async (event) => {
  const db = admin.firestore();
  const appId = event.params.appId;
  const beforeData = event.data?.before?.data();
  const afterData = event.data?.after?.data();

  // CASE 1: Application Deleted
  if (!afterData && beforeData) {
    console.log(`[onApplicationWritten] Application ${appId} deleted. Cleaning up references.`);
    const batch = db.batch();

    if (beforeData.tutorDocId) {
      batch.update(db.collection("tutors").doc(beforeData.tutorDocId), {
        pendingRequests: admin.firestore.FieldValue.arrayRemove(appId),
      });
    }

    const studentIds = beforeData.studentDocIds || (beforeData.studentDocId ? [beforeData.studentDocId] : []);
    for (const sid of studentIds) {
      batch.update(db.collection("students").doc(sid), {
        pendingRequests: admin.firestore.FieldValue.arrayRemove(appId),
      });
    }

    await batch.commit();
    return;
  }

  if (!afterData) return;

  const previousStatus = beforeData?.status;
  const currentStatus = afterData.status;

  // CASE 2: Status transitioned to 'tuition_started'
  if (currentStatus === "tuition_started" && previousStatus !== "tuition_started") {
    console.log(`[onApplicationWritten] Tuition started for ${appId}. Auto-declining competing leads.`);
    const batch = db.batch();

    // 1. Remove from pending requests
    if (afterData.tutorDocId) {
      batch.update(db.collection("tutors").doc(afterData.tutorDocId), {
        pendingRequests: admin.firestore.FieldValue.arrayRemove(appId),
      });
    }
    const studentIds = afterData.studentDocIds || (afterData.studentDocId ? [afterData.studentDocId] : []);
    for (const sid of studentIds) {
      batch.update(db.collection("students").doc(sid), {
        pendingRequests: admin.firestore.FieldValue.arrayRemove(appId),
      });
    }

    // 2. Ensure pending_tuition_fees document exists
    const pendingFeeRef = db.collection("pending_tuition_fees").doc(appId);
    const pendingFeeSnap = await pendingFeeRef.get();
    if (!pendingFeeSnap.exists) {
      batch.set(pendingFeeRef, {
        applicationDocId: appId,
        studentDocId: afterData.parentDocId || afterData.studentDocId || "",
        tutorDocId: afterData.tutorDocId || "",
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
        amount: afterData.finalPrice || afterData.currentOffer || afterData.budget || 4000,
      });
    }

    // 3. Auto-decline competing leads for this student/group
    const qGroupId = afterData.groupDocId || afterData.studentDocId;
    if (qGroupId) {
      const [snap1, snap2] = await Promise.all([
        db.collection("applications").where("groupDocId", "==", qGroupId).get(),
        db.collection("applications").where("studentDocId", "==", qGroupId).get(),
      ]);

      const competingDocs = new Map();
      snap1.docs.forEach((d) => competingDocs.set(d.id, d));
      snap2.docs.forEach((d) => competingDocs.set(d.id, d));

      for (const [compDocId, compDocSnap] of Array.from(competingDocs.entries())) {
        const compData = compDocSnap.data();
        if (
          compDocId !== appId &&
          compData.status !== "declined" &&
          compData.status !== "tuition_started"
        ) {
          batch.update(compDocSnap.ref, {
            status: "declined",
            reason: "student_hired_another_tutor",
            declinedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (compData.tutorDocId) {
            batch.update(db.collection("tutors").doc(compData.tutorDocId), {
              pendingRequests: admin.firestore.FieldValue.arrayRemove(compDocId),
            });
          }
        }
      }
    }

    await batch.commit();
    return;
  }

  // CASE 3: Status transitioned to 'declined'
  if (currentStatus === "declined" && previousStatus !== "declined") {
    console.log(`[onApplicationWritten] Application ${appId} declined. Cleaning up pending queue.`);
    const batch = db.batch();

    if (afterData.tutorDocId) {
      batch.update(db.collection("tutors").doc(afterData.tutorDocId), {
        pendingRequests: admin.firestore.FieldValue.arrayRemove(appId),
      });
    }

    const studentIds = afterData.studentDocIds || (afterData.studentDocId ? [afterData.studentDocId] : []);
    for (const sid of studentIds) {
      batch.update(db.collection("students").doc(sid), {
        pendingRequests: admin.firestore.FieldValue.arrayRemove(appId),
      });
    }

    await batch.commit();
  }
});
