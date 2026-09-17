import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Safely deletes a user's account or a single role profile.
 * STRICT ENFORCEMENT: Blocks deletion if an active tuition agreement ('tuition_started') exists.
 */
export const deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required to delete account.");
  }

  const uid = request.auth.uid;
  const targetRole = request.data?.role as string | undefined; // Optional: 'student' | 'teacher' for dual-role partial deletion
  const db = admin.firestore();

  // 1. Contract Integrity Check: Verify NO active tuition agreements exist
  const [activeParentApps, activeTutorApps] = await Promise.all([
    db.collection("applications")
      .where("parentDocId", "==", uid)
      .where("status", "==", "tuition_started")
      .get(),
    db.collection("applications")
      .where("tutorDocId", "==", uid)
      .where("status", "==", "tuition_started")
      .get(),
  ]);

  if (!activeParentApps.empty || !activeTutorApps.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot delete account while you have an active tuition agreement. Please complete or resolve active tuitions first."
    );
  }

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const currentRoles: string[] = userData.roles || [];

  // Check if dual-role user deleting only one role
  const isPartialRoleDeletion = Boolean(
    targetRole &&
    currentRoles.length > 1 &&
    currentRoles.includes(targetRole)
  );

  const batch = db.batch();

  if (isPartialRoleDeletion && targetRole === "teacher") {
    // Delete teacher profile sub-collection and teacher-specific records
    batch.delete(db.collection("tutors").doc(uid));

    // Delete teacher applications that are not ongoing
    const tutorApps = await db.collection("applications").where("tutorDocId", "==", uid).get();
    tutorApps.docs.forEach((doc) => batch.delete(doc.ref));

    // Update user doc roles array
    const updatedRoles = currentRoles.filter((r) => r !== "teacher");
    batch.update(userRef, {
      roles: updatedRoles,
      role: updatedRoles[0] || "student",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true, isFullyDeleted: false, remainingRoles: updatedRoles };
  } else if (isPartialRoleDeletion && targetRole === "student") {
    // Delete parent profile sub-collection and student-specific records
    batch.delete(db.collection("parents").doc(uid));

    const [studentsSnap, groupsSnap, reqSnap] = await Promise.all([
      db.collection("students").where("parentDocId", "==", uid).get(),
      db.collection("groups").where("parentDocId", "==", uid).get(),
      db.collection("tuition_requests").where("parentDocId", "==", uid).get(),
    ]);

    studentsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    groupsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    reqSnap.docs.forEach((doc) => batch.delete(doc.ref));

    const updatedRoles = currentRoles.filter((r) => r !== "student");
    batch.update(userRef, {
      roles: updatedRoles,
      role: updatedRoles[0] || "teacher",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true, isFullyDeleted: false, remainingRoles: updatedRoles };
  }

  // Complete Account Deletion (Single-role or deleting entire user profile)
  const [
    studentsSnap,
    groupsSnap,
    parentAppsSnap,
    tutorAppsSnap,
    tuitionReqSnap,
    referralsSnap1,
    referralsSnap2,
    orphanedPayoutsSnap,
  ] = await Promise.all([
    db.collection("students").where("parentDocId", "==", uid).get(),
    db.collection("groups").where("parentDocId", "==", uid).get(),
    db.collection("applications").where("parentDocId", "==", uid).get(),
    db.collection("applications").where("tutorDocId", "==", uid).get(),
    db.collection("tuition_requests").where("parentDocId", "==", uid).get(),
    db.collection("referrals").where("referrerId", "==", uid).get(),
    db.collection("referrals").where("referredUserId", "==", uid).get(),
    // Cancel any held escrow payouts so the daily scheduler doesn't send money to a deleted UPI (V13 fix)
    db.collection("tutor_payouts").where("tutorDocId", "==", uid).where("status", "==", "escrow_held").get(),
  ]);

  studentsSnap.docs.forEach((d) => batch.delete(d.ref));
  groupsSnap.docs.forEach((d) => batch.delete(d.ref));
  parentAppsSnap.docs.forEach((d) => batch.delete(d.ref));
  tutorAppsSnap.docs.forEach((d) => batch.delete(d.ref));
  tuitionReqSnap.docs.forEach((d) => batch.delete(d.ref));
  referralsSnap1.docs.forEach((d) => batch.delete(d.ref));
  referralsSnap2.docs.forEach((d) => batch.delete(d.ref));
  // Cancel held escrow payouts linked to this tutor so the scheduler doesn't pay out to a deleted account
  orphanedPayoutsSnap.docs.forEach((d) => batch.update(d.ref, {
    status: "cancelled_account_deleted",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }));

  batch.delete(db.collection("parents").doc(uid));
  batch.delete(db.collection("tutors").doc(uid));
  batch.delete(userRef);

  await batch.commit();

  // Wipe Firebase Authentication record
  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    console.error("Error deleting auth user:", err);
  }

  return { success: true, isFullyDeleted: true };
});
