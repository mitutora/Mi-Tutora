import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { rankAndPaginateStudents } from "../utils/matchingEngine";

/**
 * 2nd Gen Callable Cloud Function: getRankedStudents
 * Performs server-side scoring, group preference stitching, and 20-card slicing for the Teacher Dashboard.
 * Guarantees that Rank #1 is always Card #1 on Page 1.
 */
export const getRankedStudents = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required to fetch ranked student requests.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  const data = request.data || {};
  const {
    tab = "recommended",
    page = 1,
    limit = 20,
    category,
  } = data;

  // 1. Fetch Teacher profile
  let teacherData: any = null;
  let tutorId = uid;

  const tutorDocSnap = await db.collection("tutors").doc(uid).get();
  if (tutorDocSnap.exists) {
    teacherData = tutorDocSnap.data();
    tutorId = tutorDocSnap.id;
  } else {
    const tutorQuerySnap = await db
      .collection("tutors")
      .where("authUid", "==", uid)
      .limit(1)
      .get();
    if (!tutorQuerySnap.empty) {
      teacherData = tutorQuerySnap.docs[0].data();
      tutorId = tutorQuerySnap.docs[0].id;
    }
  }

  if (!teacherData) {
    throw new HttpsError("not-found", "Teacher profile not found.");
  }

  // 2. Fetch available students, groups, and teacher applications in parallel
  const [studentsSnap, groupsSnap, applicationsSnap] = await Promise.all([
    db.collection("students").where("isAvailable", "==", true).limit(300).get(),
    db.collection("groups").limit(150).get(),
    db.collection("applications").where("tutorDocId", "==", tutorId).get(),
  ]);

  const groupsMap = new Map<string, any>();
  groupsSnap.docs.forEach((doc) => {
    groupsMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  // 3. Stitch group preferences (e.g. teacherGenderPreference) into student records
  const stitchedStudents = studentsSnap.docs.map((doc) => {
    const sData = doc.data() as any;
    const groupDocId = sData.groupDocId || sData.id;
    const matchingGroup = groupsMap.get(groupDocId);

    let cleanMode = matchingGroup?.mode || sData.mode || "";
    if (cleanMode === "Offline (Home Tuition)") cleanMode = "Offline";

    return {
      id: doc.id,
      ...sData,
      mode: cleanMode,
      area: matchingGroup?.area || sData.area || "",
      city: matchingGroup?.city || sData.city || "",
      latitude: matchingGroup?.latitude ?? sData.latitude ?? null,
      longitude: matchingGroup?.longitude ?? sData.longitude ?? null,
      requestDoc: matchingGroup || null,
      teacherGenderPreference:
        matchingGroup?.teacherGenderPreference ||
        sData.teacherGenderPreference ||
        "No Preference",
    };
  });

  const applications = applicationsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // 4. Score, sort globally, and slice 20 cards per page
  const result = rankAndPaginateStudents(teacherData, stitchedStudents, applications, {
    tab: tab === "all" ? "all" : "recommended",
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    category,
    teacherUserId: uid,
  });

  return {
    success: true,
    students: result.students,
    totalMatches: result.totalMatches,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
  };
});
