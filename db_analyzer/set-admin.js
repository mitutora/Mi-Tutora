import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "tutor-app-1e394-firebase-adminsdk-fbsvc-229cb7c69a.json"), "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const auth = admin.auth();

async function manageAdmin() {
  const action = process.argv[2]; // "add" or "remove"
  const email = process.argv[3]; // user email

  if (!action || !email) {
    console.log("Usage: node db_analyzer/set-admin.js <add|remove> <email>");
    process.exit(1);
  }

  try {
    const user = await auth.getUserByEmail(email);
    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();
    const data = snap.exists ? snap.data() : {};
    let roles = Array.isArray(data.roles) ? [...data.roles] : ["student"];

    if (action === "add") {
      if (!roles.includes("admin")) roles.push("admin");
      await userRef.set({ role: "admin", roles, email: user.email }, { merge: true });
      await auth.setCustomUserClaims(user.uid, { admin: true, role: "admin" });
      console.log(`Successfully granted ADMIN privileges to ${email} (UID: ${user.uid})`);
    } else if (action === "remove") {
      roles = roles.filter((r) => r !== "admin");
      await userRef.set({ role: roles[0] || "student", roles }, { merge: true });
      await auth.setCustomUserClaims(user.uid, { admin: false, role: roles[0] || "student" });
      console.log(`Successfully removed ADMIN privileges from ${email} (UID: ${user.uid})`);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

manageAdmin();
