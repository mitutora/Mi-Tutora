# Firebase Cloud Functions (2nd Gen) — Live Architecture Reference

> **Status: Fully Implemented & Deployed** — All 11 functions are live in production (region: `asia-south1`).

This document is the authoritative architecture reference for all **Firebase Cloud Functions (2nd Gen)** powering the Mi-Tutora backend. All heavy mathematical calculations, ranking algorithms, escrow disbursements, time-sensitive state machines, and webhook listeners run in secure, isolated serverless containers — fully decoupled from the browser client.

---

## 1. Architectural Summary & System Topology

```
                           ┌────────────────────────────────────────────────────────┐
                           │            Firebase Cloud Functions (2nd Gen)           │
                           │                 Region: asia-south1                    │
                           └────────────────────────────────────────────────────────┘
                                     │                        │              │
                     ┌───────────────┴───────────────┐        │              │
                     ▼                               ▼        │              ▼
          ┌─────────────────────┐        ┌──────────────────┐ │   ┌────────────────────┐
          │   Cloud Scheduler   │        │ Callable & HTTP  │ │   │ Firestore Triggers │
          │   (Cron Runners)    │        │   API Handlers   │ │   │  & Auth Triggers   │
          └─────────────────────┘        └──────────────────┘ │   └────────────────────┘
                     │                            │           │              │
         ┌───────────┼────────────┐               │           │    ┌─────────┼──────────┐
         ▼           ▼            ▼               ▼           ▼    ▼         ▼          ▼
     Weekly       Daily        Hourly          Banked      Ranked  Queue    Rating   Referral
      Quota      Payouts     Demo Expiry       Tokens      Match   Purge     Sync      Auth
     00:00 IST  00:00 IST     0 * * * *       Callable    Callable Write   OnCreate  OnCreate
```

---

## 2. Production Functions Catalog

| Category | Function Name | File Location | Trigger / Schedule | Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Scheduled** | `weeklyQuotaReset` | `functions/src/scheduled/weeklyQuotaReset.ts` | Every Monday `00:00 IST` (`0 0 * * 1`) | Resets weekly proposal token quotas for all tutors (Free: 5, Pro: 15). Uses `BatchManager` (400-op chunks). |
| **Scheduled** | `dailyPayouts` | `functions/src/scheduled/dailyPayouts.ts` | Every Night `00:00 IST` (`0 0 * * *`) | Processes Day 30 matured escrow payouts (Tutor 60%, Referrer 25%) via RazorpayX. Enforces strict double-defense assertion verifying student payment before disbursement. Deterministic doc ID `payout_${appId}`. |
| **Scheduled** | `expireDemosAndDecisions` | `functions/src/scheduled/expireDemos.ts` | Hourly (`0 * * * *`, IST) | Auto-completes expired demo sessions (>24h past scheduled time) and auto-declines 48h inactive hiring decisions. |
| **Callable** | `redeemBankedToken` | `functions/src/callable/redeemToken.ts` | `onCall` (Auth required) | Converts 1 referral banked token into an active weekly proposal credit. Atomic Firestore transaction. |
| **Callable** | `deleteUserAccount` | `functions/src/callable/deleteAccount.ts` | `onCall` (Auth required) | Safely anonymizes account, deletes personal data, but blocks deletion if active tuition exists. |
| **Callable** | `getRankedTutors` | `functions/src/callable/getRankedTutors.ts` | `onCall` (Public/Auth) | Evaluates 100% of tutors, applies strict filters (including Delivery Mode) & suitability scoring (with offline proximity), returns 20-card slices with `hasMore`. |
| **Callable** | `getRankedStudents` | `functions/src/callable/getRankedStudents.ts` | `onCall` (Tutor Auth) | Evaluates 100% of student posts, applies strict filters (including Delivery Mode) & suitability scoring (with offline proximity), returns 20-card slices with `hasMore`. |
| **Reactive Trigger** | `onUserCreated` | `functions/src/triggers/onUserCreated.ts` | `auth.user().onCreate` | Validates referral codes upon signup, prevents self-referrals, and creates tracking records in Firestore. |
| **Reactive Trigger** | `onReviewCreated` | `functions/src/triggers/onReviewCreated.ts` | `firestore.onDocumentCreated` | Recalculates rolling star average on tutor profile atomically when a review is submitted. |
| **Reactive Trigger** | `onApplicationWritten` | `functions/src/triggers/onApplicationWritten.ts` | `firestore.onDocumentWritten` | Auto-declines competing applications when a tutor is hired; decrements active queues. |
| **Secure Webhook** | `handleRazorpayWebhook` | `functions/src/webhooks/razorpayWebhook.ts` | `onRequest` (HTTPS POST) | Ingests payment captures, validates HMAC SHA-256 signatures, activates tuitions/escrow with concurrency locks. |

---

## 3. Server-Side Ranking Engine & 20-Card Lazy Loading

### Implementation Details (`functions/src/utils/matchingEngine.ts`)
- **Global Rank #1 Guarantee:** Rather than limiting Firestore queries with arbitrary limits that miss the best match, the engine queries all candidate profiles, runs strict filtering (`isStrictMatch` including Category, Board, Class, Gender, 100% Subjects, and Delivery Mode) and multi-factor suitability scoring (+50/subject, +30 class, +20 board, 0-30 budget, +10 to +30 offline proximity via Haversine formula, +20 KYC, +20 Pro), and sorts the entire candidate pool by score descending.
- **20-Card Paginated Delivery:**
  The callable functions accept `{ page: number, pageSize: 20 }` and return `{ items, total, page, pageSize, hasMore }`.
- **Client Integration:**
  Both Student and Teacher dashboards consume these slices, rendering an initial 20 cards and loading subsequent 20-card batches on user scroll / "Load More" click.

---

## 4. Batch & Concurrency Safeguards

1. **`BatchManager` (400-Operation Limit):**
   Firestore enforces a hard maximum of 500 operations per batch write. All scheduled batch operations (`weeklyQuotaReset`, `dailyPayouts`) use a helper class that automatically commits and rolls over to a new batch at 400 operations, preventing batch overflow exceptions.
2. **Deterministic Escrow IDs:**
   Escrow disbursement records in `tutor_payouts` use deterministic document keys formatted as `payout_${applicationId}`. If a network retry occurs, Firestore treats it as an idempotent overwrite rather than creating duplicate payouts.
3. **Optimistic Concurrency Lock on Payments:**
   `handleRazorpayWebhook` validates payments against an atomic write lock on `payments/{orderId}`, ensuring duplicate webhook deliveries from Razorpay cannot trigger double activations or duplicate escrow creations.
4. **Banked Token Atomicity:**
   `redeemBankedToken` executes inside a Firestore runTransaction:
   - Reads `tutors/{tutorId}`
   - Verifies `bankedTokens > 0`
   - Decrements `bankedTokens` by 1 and increments `tokens` by 1 simultaneously.
5. **Double-Defense Payout Verification Guard:**
   `dailyPayouts` explicitly verifies that `studentPaymentId` and `paidByStudentAt` exist on `tutor_payouts`, and that `refData.status === 'qualified'` and `qualifiedAt` exist on `referrals`. Any document where student payment has not been recorded is automatically skipped from payout execution.

---

## 5. Development & Deployment Workflow

To build and test the Cloud Functions locally:

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run local Firebase Emulator suite
npm run serve
```

To deploy to production:

```bash
firebase deploy --only functions
```

