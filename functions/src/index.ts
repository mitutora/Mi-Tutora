import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK once at the root level
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export Phase 1 Callable Functions
export { redeemBankedToken } from "./callable/redeemToken";
export { deleteUserAccount } from "./callable/deleteAccount";

// Export Phase 2 Scheduled Functions (Cloud Scheduler)
export { processDailyPayouts, processDailyPayouts as dailyPayouts } from "./scheduled/dailyPayouts";
export { expireDemosAndDecisions } from "./scheduled/expireDemos";
export { resetWeeklyTeacherQuotas, resetWeeklyTeacherQuotas as weeklyQuotaReset } from "./scheduled/weeklyQuotaReset";

// Export Phase 3 Event-Driven Triggers
export { onApplicationWritten } from "./triggers/onApplicationWritten";
export { onReviewCreated } from "./triggers/onReviewCreated";
export { onUserCreated } from "./triggers/onUserCreated";

// Export Phase 4 Webhook Endpoints
export { handleRazorpayWebhook } from "./webhooks/razorpayWebhook";

// Export Ranking & Matchmaking Engine
export { getRankedTutors } from "./callable/getRankedTutors";
export { getRankedStudents } from "./callable/getRankedStudents";


