# Payment Security & Integration Architecture

This document maps out the highly secure, server-side verified payment architecture designed to integrate seamlessly with Razorpay. It ensures that hackers cannot bypass payments by modifying frontend variables or manipulating database requests.

## 1. The Core Philosophy (Plug-and-Play)
The system operates dynamically based on environment variables provided in `.env.local`.
*   **Test Mode:** By using Razorpay's `rzp_test_` keys, developers can simulate successful or failed payments natively in the web app using dummy cards. This allows end-to-end testing of the platform without real money.
*   **Live Mode:** By swapping to `rzp_live_` keys, the backend will automatically route real transactions to Razorpay and cryptographically verify the signatures.

## 2. Database Architecture (The `payments` Ledger)
To ensure absolute financial integrity and auditing, we do not store payment transaction histories inside the `applications` document. Instead, we use a dedicated `payments` collection.

*   **The Ledger (`payments` collection):** Every time a user clicks "Pay", a permanent record is created here containing the `razorpayOrderId`, `amount`, `walletDiscountApplied`, `userId`, `status`, `type` (e.g., 'application' or 'subscription') and strictly the raw Firestore Document references. 
*   **The Outgoing Escrow Ledger (`tutor_payouts` collection):** Outgoing disbursements to educators are strictly segregated from incoming student payments into `tutor_payouts`. When a student pays the Day 7 tuition fee, the platform retains its 40% commission and creates an escrow record for the 60% tutor share, locked until Day 30 (`startDate + 30 days`).
*   **Wallet Deduction Security:** `/api/create-order` calculates the wallet discount and securely stores the exact `walletDiscountApplied` in the `payments` document. `/api/verify-payment` *strictly* reads this backend database field to deduct the wallet balance, rendering it 100% immune to frontend payload manipulation.
*   **The Application (`applications` collection):** Once a tuition or demo payment is securely verified, the backend simply flips `feePaid: true` or `demoPaymentPaid: true` on the application so the frontend UI can update instantly.
*   **The Tutor Profile (`tutors` collection):** Once a subscription payment is securely verified, the backend upgrades the tutor's profile to `pro` and sets a strict 30-day server timestamp for `subscriptionExpiry`.

## 3. Server-Side Routes (Next.js API)
All payment calculations and verifications happen securely on the backend.

### A. Order Creation (`/api/create-order`)
*   **Purpose:** Securely calculates the true price for tuitions/demos and generates a Razorpay Order ID.
*   **Input:** `applicationDocId`, `userId`, `role` ('student' or 'teacher'), `useWallet`.
*   **Security Check:** The backend ignores any price sent by the frontend. If `role` is 'student', it queries the application's `finalPrice`. If `role` is 'teacher', it fetches the `marketplace_pricing` matrix and recalculates the specific platform demo fee natively on the server.
*   **Day 7 Trial Gate:** When `role === 'student'` and `isRemoval === false`, the backend verifies `daysElapsed >= 7`. If `daysElapsed < 7`, the server rejects the order with `400 Bad Request` (*"Tuition fee payment unlocks on Day 7 of your trial period."*), preventing premature full tuition payments during the 7-day trial.

### B. Payment Verification (`/api/verify-payment`)
*   **Purpose:** Verifies the cryptographic signature from Razorpay for tuitions/demos.
*   **Input:** `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `applicationDocId`, `role`.
*   **Security Check:** The backend hashes the data using the Razorpay Secret Key. If the hash matches the signature, the payment is authentic. It strictly uses `walletDiscountApplied` from the database to deduct wallets securely.
*   **Database Execution:** The backend uses the `firebase-admin` SDK (which bypasses frontend rules) to update the application status and mark it as paid.
*   **Auto-Decline Cleanup:** When a student successfully pays, competing applications for the same group are automatically declined. The backend also securely removes these declined application IDs from the respective teachers' `pendingRequests` arrays to prevent ghost notifications.
*   **Escrow Creation:** Atomically splits the tuition into 40% platform fee and 60% tutor share, logging an escrow record in `tutor_payouts` with a Day 30 unlock timestamp.

### C. Subscription Order Creation (`/api/create-subscription-order`)
*   **Purpose:** Securely generates a Razorpay Order ID specifically for Pro Plan upgrades.
*   **Input:** `userId` (the teacher's ID).
*   **Security Check:** The backend hardcodes the price to exactly ₹299. It ignores any pricing data sent by the frontend, ensuring hackers cannot alter the subscription price.

### D. Subscription Payment Verification (`/api/verify-subscription-payment`)
*   **Purpose:** Verifies the cryptographic signature from Razorpay for subscriptions.
*   **Input:** `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `userId`.
*   **Security Check:** Hashes the data using the Razorpay Secret Key. If authentic, it uses the `firebase-admin` SDK to update the `tutors` document. 
*   **Time-Tamper Proofing:** It strictly calculates the 30-day `subscriptionExpiry` lock on the backend using the Admin SDK's `Timestamp.now()`. This makes it 100% immune to client-side clock tampering.

### E. Referral Reward Distribution (Backend Embedded)
*   **Mechanism:** When a student successfully pays for the first month of tuition (Day 7 payment), the `/api/verify-payment` route automatically intercepts this success state. It securely calculates the 25% reward strictly from the platform's 40% margin (10% of total tuition). If a student was referred, the reward is locked in `referrals` escrow (`payoutStatus: 'escrow_held'`) with a Day 30 release timestamp and target UPI address. If a teacher was referred, 1 banked token is immediately credited to `tutors.bankedTokens`.

### F. Automated Day 30 Dual-Payout Engine (`dailyPayouts` Cloud Scheduler & `/api/payouts/process`)
*   **Purpose:** Scheduled cron runner executing disbursements for all eligible Month 1 tuitions and qualified referral rewards reaching Day 30 (`releaseEligibleAt <= Date.now()`). Runs nightly at **00:00 IST** via Cloud Scheduler.
*   **Strict Prerequisite Check (Double Defense):** Payouts are mathematically locked until the student has paid. The engine strictly verifies `studentPaymentId` and `paidByStudentAt` on `tutor_payouts`, and `status === 'qualified'` and `qualifiedAt` on `referrals`. Any record missing proof of student fee payment is skipped from disbursement.
*   **Mechanism:** Queries both `tutor_payouts` (60% tuition share) and `referrals` (25% margin reward). Disburses funds simultaneously to both beneficiaries via Razorpay Payouts API (`POST /v1/payouts`) with `"queue_if_low_balance": true`. If UPI is missing, marks status as `'action_required_missing_upi'` independently.
*   **Batch & Idempotency Safeguards:** Employs `BatchManager` (400-op chunks) and deterministic payout IDs (`payout_${applicationId}`).

### G. Razorpay Webhook Cloud Function (`handleRazorpayWebhook`)
*   **File:** `functions/src/webhooks/razorpayWebhook.ts`
*   **Purpose:** Asynchronous payment ingestion and confirmation directly from Razorpay servers (`order.paid`, `payment.captured`), ensuring transactions are settled even if a user closes their browser before redirect.
*   **HMAC SHA-256 Signature Verification:** Validates raw webhook body against `x-razorpay-signature` using the Razorpay Webhook Secret.
*   **Optimistic Concurrency Lock:** Queries `payments/{orderId}` inside a transaction. If already marked `completed`, the webhook safely exits without re-processing.
*   **Deterministic Escrow Creation:** Creates escrow records in `tutor_payouts` with deterministic IDs (`payout_${applicationId}`) to prevent duplicate disbursements on webhook re-delivery.

### H. Admin Manual Fallback Mode (`/api/admin/payouts/export-csv`)
*   **Purpose:** Allows platform administrators to export a corporate netbanking CSV file of all pending payouts (both Tutors and Student Referrers) for manual bulk bank transfers if RazorpayX is undergoing maintenance.

## 4. Frontend Integration Points

### A. Student Portal (`web/src/app/dashboard/student/page.tsx`)
*   **Trigger Entry Points:** Paying the tuition fee can be initiated from:
    1.  **Grace Period Reminder Pop-Up (Days 7–9):** Dismissible modal prompting payment on load with "Pay Monthly Fees" button.
    2.  **My Teachers Tab:** Direct "Pay Monthly Fees" button on the active teacher card.
    3.  **Account Locked Screen (Day 10+):** Fullscreen lock card with "Pay Monthly Fees Securely" button.
    4.  **Tutor View Modal (`TutorViewModal.tsx`):** Unlocks on Day 7 (Days 0–6 rendered blurred and disabled with lock icon and live trial countdown).
*   **Flow:** Call `/api/create-order` -> Open Root-Level Razorpay Widget (`payingClass`) -> Send signature to `/api/verify-payment` -> UI refreshes to show `feePaid: true`.
*   **Instant Remove Teacher Flow:** If a student has already paid (`isPaid === true`), clicking "Remove Teacher" instantly terminates the tuition by calling the `executeDeclineOffer` utility. This completely bypasses the Razorpay checkout modal to mathematically prevent double-charging.

### B. Teacher Portal (`web/src/app/dashboard/teacher/page.tsx`)
*   **Trigger:** Paying the demo/platform fee.
*   **Flow:** Call `/api/create-order` -> Open Razorpay Widget -> Send signature to `/api/verify-payment` -> UI refreshes to show `demo_booking_phase`.

### C. Teacher Portal (Subscription Upgrade)
*   **Trigger:** Clicking "Confirm & Pay" on the Upgrade to Pro modal.
*   **Flow:** Call `/api/create-subscription-order` -> Open Razorpay Widget -> Send signature to `/api/verify-subscription-payment` -> UI refreshes to show "Active Plan".

## 5. Firestore Security Rules (The Firewall)
The `firestore.rules` file contains an active firewall to physically block frontend tampering.

**Active Protections:**
*   Users **cannot** manually update the `status` field to `tuition_started` or `demo_booking_phase` (prevents skipping the payment gateway).
*   Users **cannot** manually set `feePaid: true` or `demoPaymentPaid: true`.
*   Only the backend (via `firebase-admin`) has the authority to make these specific field changes during the verification phase.

## 6. The "Go-Live" Checklist
The codebase is fully stripped of simulation mocks and is currently wired directly to Razorpay's Test Mode.

When you are ready to launch the real payment system, you **must** complete the following single step:

1. **Swap to Live Keys:** Replace your `rzp_test_` keys with `rzp_live_` keys in your `.env.local` file and restart your server. No code changes are required!
