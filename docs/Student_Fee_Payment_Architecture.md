# Student Fee Payment & Cancellation Architecture

This document maps out the precise business logic, the Razorpay integration, and the exact workflow for how students pay for tuitions, including the 7-day trial and the secure backend mathematical locks.

---

## 1. The "Hire Teacher" Lifecycle (Flow Diagram)

The following diagram illustrates the exact technical journey from the moment a student decides to hire a teacher, through the 7-day trial, and finally into the secure Razorpay payment gateway.

```mermaid
graph TD
    A[Student clicks 'Hire'] --> B[API: /transactions/hire]
    B --> C[(Database)]
    C -->|Sets status: tuition_started| D(7-Day Trial Begins)
    C -->|Sets startDate: serverTimestamp| D
    
    D --> E{Timeline & Action}
    
    E -->|Days 0 to 6: Trial in Progress| E1[Student View Modal: Pay Fee Blurred & Disabled with Countdown]
    E -->|Clicks 'Remove' < Day 7| F[UI requests Prorated Checkout & records cancellationRequested: true]
    E -->|Days 7 to 19: Grace Period| G[Dismissible Pop-Up: 'Pay Monthly Fees' with Dynamic Countdown]
    E -->|Day 7+: TutorViewModal Unlocks| G1[Active 'Pay Fee' Button]
    E -->|Day 20+: Post-Grace Period| G2[Hard Lock Screen: 'Pay Monthly Fees Securely']
    
    F --> H[API: /create-order]
    G -->|Clicks Pay Monthly Fees| I[API: /create-order]
    G1 -->|Clicks Pay Fee| I
    G2 -->|Clicks Pay Monthly Fees Securely| I
    
    H -->|isRemoval: true| J[Backend strictly calculates daysElapsed via server clock. Computes prorated fee.]
    I -->|isRemoval: false| K[Backend verifies daysElapsed >= 7. Fetches 100% full monthly fee from Database.]
    
    J --> L[Razorpay Checkout Popup]
    K --> L
    
    L -->|Payment Success| M[API: /verify-payment]
    M --> N[(Ledger Updated)]
    N -->|type: tuition| O[Transaction finalized. Escrow Created. Referrals Paid.]
```

---

## 2. Payment Gateway Integration (Razorpay)

The payment system is deeply integrated to protect against client-side tampering while elegantly handling three distinct types of transactions.

### A. Order Generation (`/api/create-order`)
When a student initiates a payment, the frontend passes `role: 'student'` and an `isRemoval` flag. 
*   **Security Lock:** The backend completely ignores the price sent by the frontend. It fetches the application data directly from Firestore.
*   **Day 7 Trial Gate (Anti-Tamper Lock):** If `isRemoval` is false (regular monthly fee payment) and `startDate` is present, the backend verifies that `daysElapsed >= 7`. If `daysElapsed < 7`, the server strictly rejects order creation with `400 Bad Request` (*"Tuition fee payment unlocks on Day 7 of your trial period."*). This prevents premature charges and guarantees trial protection.
*   **The Prorated Math Engine:** If `isRemoval` is true, the backend calculates the difference between Google's atomic server time (`admin.firestore.Timestamp.now().toMillis()`) and the exact `startDate`. 
    *   If it is under 7 days, it mathematically prorates the monthly fee exactly: `(Monthly Fee ÷ Days in Month) × Days Elapsed`.
    *   If it is 7 days or more, it rejects the discount and charges the 100% full fee.
*   **Ledger Tagging:** Before sending the order to Razorpay, the system creates a pending entry in the `payments` collection tagged securely as `type: 'tuition'`.

### B. Payment Verification (`/api/verify-payment`)
When Razorpay successfully charges the card, it pings this secure webhook.
*   The system cross-references the `razorpayOrderId` with the `payments` ledger.
*   **Referral Engine Trigger:** If the payment is a full tuition fee, the system automatically checks for a `pending` referral. 
    *   If a student referred them, they earn **25% of the platform's 40% margin** (approx. 10% of total course value) as wallet cash.
    *   If a teacher referred them, they earn 1 Banked Token (Free Request).
*   **Auto-Decline:** Finally, all competing tuition requests for that specific student are automatically marked as `declined` so the queue stays clean.

---

## 3. The Business Logic Phases

### Phase 1: The 7-Day Trial Period
**Trigger:** The teacher is hired and the application status changes to `tuition_started`. The system begins counting `daysElapsed` starting from the `startDate`.

*   **Status:** The student receives classes but has not paid the monthly fee yet (`feePaid: false`).
*   **The Admin Tracker:** The moment the student hires the teacher, a record is added to the `pending_tuition_fees` database collection to track unpaid dues.
*   **Student View (Fee Button Gating in TutorViewModal):**
    *   In the student portal `TutorViewModal` (under Payment Details), the "Pay Fee" button is rendered in a blurred, disabled state (`backdrop-blur-[2px] opacity-75 cursor-not-allowed`) displaying a lock icon and live countdown: `Unlocks Day 7 ({7 - daysElapsed}d left)`.
    *   Hovering provides a tooltip: *"7-day trial in progress. Payment unlocks on Day 7 ([Day 7 Date])."*
    *   Full monthly payment is prohibited during Days 0–6 to preserve trial protections and prevent proration conflicts upon early cancellation.
*   **Teacher View (Earnings Transparency):**
    *   **Stage 1 (Student Fee):** Amber clock badge `Due on [Day 7 Date] (Trial Day 7)` with live countdown (*"Student 7-day trial in progress ({7 - daysElapsed} days remaining). Fee will be collected by platform."*).
    *   **Stage 2 (Tutor Payout):** Slate calendar badge `Expected: ₹Y on [Day 30 Date]` with prominent `Student Fee Required` pill (*"Day 30 payout locks into escrow automatically once student pays on Day 7."*).
*   **Cancellation Policy & Persistent Reminders (Prorated):** 
    *   If the student decides they do not like the teacher and clicks "Remove Teacher" **before** 7 days have passed (`daysElapsed < 7`).
    *   The platform records `cancellationRequested: true` and calculates a **prorated fee** for the exact days attended: `(Monthly Fee ÷ Days in Month) × Days Elapsed`.
    *   If the student closes the checkout modal without paying, a **persistent reminder banner** and **dismissible pop-up** prompt them on every visit to clear the prorated fee or withdraw their cancellation.
    *   The teacher is notified to pause classes while settlement is pending.
    *   Once this prorated exit-fee is paid via Razorpay, the teacher is officially removed (`status: 'declined'`).

### Phase 2: The 13-Day Grace Period (Days 7 to 19)
**Trigger:** 7 full days have elapsed (`daysElapsed >= 7` but `< 20`) and the fee is still unpaid (`feePaid: false`).

*   **Status:** The trial period has officially ended, but the student is in an active 13-day grace period.
*   **Student View (Dismissible Pop-Up & Full Portal Access):**
    *   Every time the student opens or refreshes the portal, an amber **"Monthly Tuition Fee Due"** reminder pop-up appears displaying the tutor name, monthly fee, and a dynamic countdown of remaining days (`{20 - daysElapsed} days remaining`).
    *   The student can click **"Remind Me Later"** or **`✕`** to dismiss the pop-up and freely browse, make offers, and use all dashboard tabs without lockout.
    *   Clicking **"Pay Monthly Fees"** opens the Root-Level Payment Modal to settle fees via Razorpay.
*   **Teacher View (Earnings Transparency):**
    *   **Stage 1 (Student Fee):** Orange alert badge `Payment Due (Grace Period - Xd left)` (*"Trial ended on [Day 7 Date]. Student has {20 - daysElapsed} days to complete payment."*).
    *   **Stage 2 (Tutor Payout):** Amber lock badge `Payout on Hold (Awaiting Student Fee)` (*"Day 30 transfer will only lock into escrow once the student settles their dues."*).
*   **Late Cancellation Penalty:** If the student attempts to click "Remove Teacher" at this stage without having paid, the platform backend denies the prorated discount. They are forced to pay the 100% full monthly fee as a penalty to clear their dues before the teacher is removed.

### Phase 3: The Hard Lock (Day 20+)
**Trigger:** 20 full days have elapsed (`daysElapsed >= 20`) and the fee is still unpaid (`feePaid: false`).

*   **Status:** The 13-day grace period has expired without payment (20 days from tuition start).
*   **Student View (Full Account Lockout):**
    *   The entire main dashboard area is replaced with a dedicated red **"Account Locked"** screen (*"Your payment grace period has expired (Day 20). Please clear your pending tuition fees to unlock your dashboard and continue using MiTutora."*).
    *   **Sidebar Navigation Locked:** All sidebar tabs (Dashboard, New Tuition, Requests & Offers, Notifications, My Teachers, Referrals) display a lock icon (`🔒`), are dimmed with `opacity-50 cursor-not-allowed`, and disabled. Clicking any tab shows a toast warning: *"Account locked. Please clear pending tuition fees to unlock your dashboard."*
    *   The student must click **"Pay Monthly Fees Securely"** on the lock card, which mounts the root-level payment modal and opens the Razorpay checkout overlay.
*   **Teacher View (Earnings Transparency):**
    *   **Stage 1 (Student Fee):** Red alert badge `Overdue - Student Account Locked` (*"Student has not paid dues. Portal is locked. Pause classes until fee is paid."*).
    *   **Stage 2 (Tutor Payout):** Rose lock badge `Payout Blocked (Student Fee Unpaid)` (*"Day 30 Razorpay transfer will NOT execute unless the student clears their tuition fee."*).
    *   **Action Mandate:** Tutors are instructed to pause classes immediately to protect against unpaid teaching time.

### Phase 4: Post-Payment (Escrow Holding & Strict Zero Refund)
**Trigger:** The student has successfully paid the full monthly fee via Razorpay (`feePaid: true`).

*   **Status:** The transaction for the month is finalized and secure. The `pending_tuition_fees` tracking document is resolved.
*   **Teacher View (Earnings Transparency):**
    *   **Stage 1 (Student Fee):** Green checkmark badge `₹X Received by Platform` (online checkout verified).
    *   **Stage 2 (Tutor Payout):** Teal lock badge `₹Y Held in Platform Escrow (releasing on Day 30)`. Once Day 30 arrives and the transfer executes, transitions to Green checkmark badge `₹Y Disbursed to UPI` with bank UTR reference number.
*   **Financial Split & Escrow Custody:** The platform retains its **40% commission**, and atomically logs an escrow record in `tutor_payouts` for the remaining **60% tutor share**. The funds are safely held until Day 30 (`startDate + 30 days`).
*   **Automated Day 30 Payout:** Upon reaching Day 30, the platform triggers the Razorpay Payouts API to transfer the 60% balance directly to the teacher's UPI ID (strictly requiring student payment verification).
*   **First-Month Only Intermediation:** The platform fee and escrow process occur strictly for Month 1. For Month 2 onwards, parent and teacher coordinate classes and tuition fees directly offline without platform cuts.
*   **Cancellation Policy (Zero Refund):** 
    *   If the student clicks "Remove Teacher" at any point **after** paying the monthly fees, the teacher is immediately removed from the group, stopping future classes.
    *   The student receives **NO REFUND** for the remainder of the month. The platform policy is strict: once the post-trial monthly fee is submitted, it is locked in.

---

## 4. Platform Security Rules

**Account Deletion Lock:** To prevent bad actors from evading payment dues or destroying active tuition agreements by deleting their account, the platform enforces a strict **server-side barrier** via the `deleteUserAccount` Cloud Function (`functions/src/callable/deleteAccount.ts`) and `/api/auth/delete-account`. If a user attempts to delete their account while any active tuition exists (`status === 'tuition_started'`), the server strictly rejects the request with a `FAILED_PRECONDITION` error, protecting both unpaid fees and Day 30 escrow custody.
