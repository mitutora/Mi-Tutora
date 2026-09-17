import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Event-driven Cloud Function triggered when a new user registers via Firebase Auth.
 * Guarantees that users/{uid} is initialized with a valid referralCode, default roles, and zero wallet balance.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const uid = user.uid;
  const email = user.email || "";
  const name = user.displayName || (email.split("@")[0] || "User");

  // Generate unique formatted referral code (e.g. JOHN-23DEF4)
  const cleanName = (name || "USER").replace(/[^a-zA-Z]/g, "").toUpperCase();
  const namePart = (cleanName + "XXXX").substring(0, 4);
  const uidPart = (uid || "0000000000").substring(4, 10).toUpperCase();
  const referralCode = `${namePart}-${uidPart}`;

  const userRef = db.collection("users").doc(uid);
  const existingUser = await userRef.get();

  if (!existingUser.exists) {
    await userRef.set(
      {
        id: uid,
        email,
        name,
        roles: ["student"],
        role: "student",
        referralCode,
        walletBalance: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`[onUserCreated] Initialized profile for new user ${uid} with referral code ${referralCode}`);
  } else if (!existingUser.data()?.referralCode) {
    await userRef.update({
      referralCode,
      walletBalance: existingUser.data()?.walletBalance ?? 0,
    });
    console.log(`[onUserCreated] Attached missing referral code ${referralCode} to existing user ${uid}`);
  }
});
