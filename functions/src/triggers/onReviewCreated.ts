import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Event-driven Cloud Function triggered when a new review document is created in 'reviews'.
 * Atomically updates the tutor's rolling average rating and increments review count.
 */
export const onReviewCreated = onDocumentCreated("reviews/{reviewId}", async (event) => {
  const db = admin.firestore();
  const snap = event.data;
  if (!snap) return;

  const review = snap.data();
  const tutorDocId = review?.tutorDocId;
  const rating = Number(review?.rating);

  if (!tutorDocId || isNaN(rating) || rating < 1 || rating > 5) {
    console.error("[onReviewCreated] Invalid review data:", review);
    return;
  }

  const tutorRef = db.collection("tutors").doc(tutorDocId);

  await db.runTransaction(async (transaction) => {
    const tutorSnap = await transaction.get(tutorRef);
    if (!tutorSnap.exists) {
      console.warn(`[onReviewCreated] Tutor ${tutorDocId} not found.`);
      return;
    }

    const tutorData = tutorSnap.data() || {};
    const currentRating = typeof tutorData.rating === "number" ? tutorData.rating : 0;
    const currentReviewCount = typeof tutorData.reviewCount === "number" ? tutorData.reviewCount : 0;

    const newReviewCount = currentReviewCount + 1;
    const totalPreviousScore = currentRating * currentReviewCount;
    const newAverageRating = (totalPreviousScore + rating) / newReviewCount;
    const roundedRating = Math.round(newAverageRating * 10) / 10;

    transaction.update(tutorRef, {
      rating: roundedRating,
      reviewCount: newReviewCount,
      lastReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `[onReviewCreated] Updated tutor ${tutorDocId} rating: ${currentRating} -> ${roundedRating} (count: ${newReviewCount})`
    );
  });
});
