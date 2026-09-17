import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { rankAndPaginateTutors } from "../utils/matchingEngine";

/**
 * 2nd Gen Callable Cloud Function: getRankedTutors
 * Performs server-side global scoring, sorting, and 20-card slicing for the Student Dashboard.
 * Guarantees that Rank #1 is always Card #1 on Page 1.
 */
export const getRankedTutors = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required to fetch ranked tutors.");
  }

  const uid = request.auth.uid;
  const userEmail = request.auth.token.email || "";
  const db = admin.firestore();

  const data = request.data || {};
  let {
    scoringContext,
    activeGroupId,
    tab = "recommended",
    page = 1,
    limit = 20,
    category,
  } = data;

  // 1. Resolve scoring context from database if not supplied by client
  if (!scoringContext || Object.keys(scoringContext).length === 0) {
    let groupData: any = null;
    if (activeGroupId) {
      const groupSnap = await db.collection("groups").doc(activeGroupId).get();
      if (groupSnap.exists) {
        groupData = groupSnap.data();
      }
    }

    if (!groupData) {
      const studentSnap = await db
        .collection("students")
        .where("parentDocId", "==", uid)
        .limit(1)
        .get();
      if (!studentSnap.empty) {
        groupData = studentSnap.docs[0].data();
      }
    }

    scoringContext = groupData || {};
  }

  // 2. Query candidate tutors and user's active applications in parallel
  const [tutorsSnap, applicationsSnap] = await Promise.all([
    db.collection("tutors").where("hasProfile", "==", true).limit(300).get(),
    db.collection("applications").where("parentDocId", "==", uid).get(),
  ]);

  const rawTutors = tutorsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const applications = applicationsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // 3. Execute server-side scoring, global ranking, and 20-card slicing
  const result = rankAndPaginateTutors(scoringContext, rawTutors, applications, {
    tab: tab === "all" ? "all" : "recommended",
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    category,
    studentUserId: uid,
    studentUserEmail: userEmail,
    activeGroupId,
  });

  return {
    success: true,
    tutors: result.tutors,
    totalMatches: result.totalMatches,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
  };
});
