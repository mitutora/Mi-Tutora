import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import fs from 'fs';

const serviceAccountPath = './tutor-app-1e394-firebase-adminsdk-fbsvc-229cb7c69a.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

async function fetchRules() {
  try {
    const rules = getSecurityRules(app);
    const ruleset = await rules.getFirestoreRules();
    console.log("--- START RULES ---");
    if (ruleset && ruleset.source && ruleset.source.length > 0) {
      console.log(ruleset.source[0].content);
    } else {
      console.log(JSON.stringify(ruleset, null, 2));
    }
    console.log("--- END RULES ---");
  } catch (error) {
    console.error("Error fetching rules:", error);
  }
}

fetchRules();
