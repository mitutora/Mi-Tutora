# RazorpayX Payouts Setup & Manual Testing Guide

This document outlines the operational steps, environment configuration, manual testing procedures, and fallback options for **Tutor Escrow Payouts (60%)** and **Referral Cash Disbursements (25% of Platform Margin / 10% Gross)** on the Mi-Tutora platform.

---

## 1. Overview & Business Model

* **First-Month Intermediation Model:**
  * **Day 7:** Parent pays the monthly tuition fee.
  * **Escrow Holding (Days 8–30):**
    * 60% of the tuition fee is locked in `tutor_payouts` with `status: 'escrow_held'`.
    * 25% of company margin (10% of total fee) is locked in `referrals` with `payoutStatus: 'escrow_held'`.
  * **Day 30 Automated Disbursement (Strict Fee Prerequisite):**
    * The scheduled Cloud Function `dailyPayouts` runs nightly at **00:00 IST** (and `/api/payouts/process`).
    * **Strict Prerequisite Check:** Transfers strictly execute **only if the student has paid their tuition fee**. The backend verifies `studentPaymentId` and `paidByStudentAt` for tutors, and `refData.status === 'qualified'` and `qualifiedAt` for referrals. If unpaid, payout execution is strictly skipped.
    * Checks for matured records where `releaseEligibleAt <= Date.now()`.
    * Automatically transfers funds directly to the Tutor's UPI ID and the Referrer's UPI ID via the **RazorpayX Payouts API**.
    * There is **zero minimum threshold** and no manual button clicking required from users.
  * **Dashboard Transparency:**
    * **Teacher Earnings (`Active Tuitions` in `teacher/page.tsx`):** Renders real-time stage states (Trial in progress due Day 7, Overdue 3-day grace period, Hard lock pause classes alert, Platform escrow held, and Disbursed to UPI).
    * **Referrals Tracker (`ReferralsList.tsx`):** Stage 4 displays `"Awaiting Fee"` when pending, clarifying that reward locks into 30-day escrow only after friend settles fee.

---

## 2. Environment Variables & Secret Configuration

Once access is granted by the business owner in the Razorpay Dashboard, the following environment variables must be configured:

### Local Web Environment (`web/.env.local`)
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAYX_ACCOUNT_NUMBER=2323230041234567
```

### Firebase Cloud Functions (2nd Gen)
Deploy the secrets to Google Secret Manager or Firebase functions configuration:
```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAYX_ACCOUNT_NUMBER
```

---

## 3. Team Access Grant Instructions (For Business Owner)

If accessing RazorpayX results in an **"Access Denied"** screen, the primary business owner who registered the merchant account must grant permissions:

1. Log in to the main Razorpay Dashboard (`https://dashboard.razorpay.com`).
2. Go to **Account & Settings** (bottom-left) $\rightarrow$ **Manage Team**.
3. Locate the developer/operations team member's email address.
4. Check/toggle the permission for **Banking+ / RazorpayX** (or assign the role **Banking Admin** or **Operations**).
5. Save changes. The team member will now have full access to `https://x.razorpay.com`.

---

## 4. Manual Testing Steps in Razorpay Test Mode

Once RazorpayX access is unlocked:

### Step 4.1: Switch to Test Mode & Top Up Virtual Balance
1. Navigate to `https://x.razorpay.com` and ensure the **Test Mode** toggle is switched ON.
2. In the dashboard, click **"Add Funds"** next to your Current Balance.
3. Enter `₹1,00,000` (virtual test money).
4. Verify your virtual balance shows ₹1,00,000 so test disbursements do not get queued for low balance.

### Step 4.2: Verify API Key & Test Account Number
1. Under **Settings $\rightarrow$ API Keys**, copy your `Key ID` (`rzp_test_...`) and `Key Secret`.
2. Under **Profile / Account Settings**, note the **Test Account Number** (e.g. `2323230041234567`).
3. Add these to your `.env.local` and restart the Next.js development server.

### Step 4.3: Execute a Test Disbursement
To manually trigger and test a payout without waiting 30 days:
1. In Firestore, locate a test document in `tutor_payouts` or `referrals`.
2. Temporarily adjust `releaseEligibleAt` to a timestamp in the past (`Date.now() - 1000`).
3. Ensure `payoutVpa` is set to any dummy test UPI ID (e.g., `tutor@okhdfcbank` or `student@okaxis`).
4. Trigger the payout runner:
   * **Via Endpoint:** Send an authorized POST request to `/api/payouts/process` with header `x-cron-secret: <CRON_SECRET>`.
   * **Via Functions Emulator:** Trigger `processDailyPayouts` locally via `firebase emulators:start`.
5. **Expected Results:**
   * RazorpayX accepts the test payout and returns a mock transaction ID (`pout_...`) with a synthetic `utrNumber`.
   * The Firestore document updates to:
     * `status: 'paid'`
     * `razorpayPayoutId: 'pout_...'`
     * `utrNumber: 'TEST...'`
     * `paidAt: Timestamp`
   * Open the **Payouts** tab in your RazorpayX dashboard to confirm the transfer shows as "Processed".

---

## 5. Fallback Options & Admin CSV Export

If RazorpayX undergoes scheduled banking maintenance or third-party bank downtime:

1. **Automatic Balance Queuing:**
   The API includes `"queue_if_low_balance": true`. If company funds run temporarily low, transactions queue safely without failing.
2. **Admin Bulk Netbanking CSV Export:**
   Platform administrators can navigate to:
   ```
   GET /api/admin/payouts/export-csv
   ```
   This generates a banking-compliant CSV file (HDFC / ICICI / SBI format) listing all pending tutor and referrer disbursements for bulk corporate netbanking.
3. **Missing UPI Safeguard:**
   If a user has not provided their UPI ID by Day 30, the system marks the payout as `action_required_missing_upi` and surfaces a notification banner in their dashboard. The payout resumes automatically as soon as they save their UPI ID.
