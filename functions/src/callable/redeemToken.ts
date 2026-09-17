import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Atomically redeems 1 banked referral token for a teacher,
 * decrementing weeklyQuota.tokensUsed by 1 (with strict lower-bound checks).
 */
export const redeemBankedToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required to redeem tokens.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const tutorRef = db.collection("tutors").doc(uid);

  return await db.runTransaction(async (transaction) => {
    const tutorSnap = await transaction.get(tutorRef);
    if (!tutorSnap.exists) {
      throw new HttpsError("not-found", "Tutor profile not found.");
    }

    const data = tutorSnap.data() || {};
    const bankedTokens = data.bankedTokens || 0;
    if (bankedTokens <= 0) {
      throw new HttpsError("failed-precondition", "You do not have any banked tokens to redeem.");
    }

    const weeklyQuota = data.weeklyQuota || {};
    const tokensUsed = weeklyQuota.tokensUsed || 0;
    if (tokensUsed <= 0) {
      throw new HttpsError("failed-precondition", "Your weekly token quota is already full. No redemption needed.");
    }

    transaction.update(tutorRef, {
      bankedTokens: admin.firestore.FieldValue.increment(-1),
      "weeklyQuota.tokensUsed": admin.firestore.FieldValue.increment(-1),
      "weeklyQuota.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      remainingBankedTokens: bankedTokens - 1,
      newTokensUsed: tokensUsed - 1,
    };
  });
});
