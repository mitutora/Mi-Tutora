# First-Month Tuition Escrow & Razorpay Payouts Architecture

This architectural specification defines the financial workflow, escrow holding lifecycle, mathematical fee distribution, and automated disbursement engine for the **first month of tuition** on the Mi-Tutora platform.

---

## 1. Executive Summary & Business Model

Mi-Tutora employs a **First-Month Intermediation Model**. The platform guarantees quality and payment security during the critical onboarding phase (the 7-day trial + the first full month of tuition), taking a platform commission only on this initial month. Subsequent months (Month 2+) are coordinated directly between the parent and the tutor without platform deductions.

### The Financial Split Formula

When a student pays the monthly fee on Day 7, the gross amount is divided according to the following mathematical rules:

$$\text{Gross Tuition Fee } (G) = \text{Amount paid by parent on Day 7}$$
$$\text{Platform Commission } (P) = G \times 0.40 \quad (40\%)$$
$$\text{Tutor Net Share } (T) = G \times 0.60 \quad (60\%)$$
$$\text{Referral Incentive } (R) = P \times 0.25 = G \times 0.10 \quad (25\% \text{ of platform cut, i.e., } 10\% \text{ of gross})$$
$$\text{Platform Net Margin } = P - R = G \times 0.30 \quad (30\% \text{ net retained revenue})$$

### Concrete Example: ₹6,000 Tuition Fee

| Financial Component | Formula / Share | Example (₹6,000) | Destination & Custody |
| :--- | :--- | :--- | :--- |
| **Gross Inflow (Checkout)**| Agreed Monthly Tuition Rate | **₹6,000** | Paid by Parent on Day 7 via Razorpay |
| **Platform Commission** | 40% of Base Fee | **₹2,400** | Platform Gross Margin |
| **Tutor Share (Escrow)** | 60% of Base Fee | **₹3,600** | **Held in platform escrow until Day 30** |
| **Referral Reward (Escrow)** | 25% of Platform Cut | **₹600** | **Held in platform escrow until Day 30; then deposited automatically via UPI** |
| **Platform Net Margin** | Platform Cut minus Referral | **₹1,800** | Net platform retained earnings |

### 1.3 Teacher Proposal Breakdown (`StudentViewModal.tsx`)

When a teacher reviews a student tuition inquiry or inputs a counter-offer in the **Student View Modal**, the modal features a dual-card earnings breakdown:
- **Month 1 (Trial & Onboarding)**: Shows **60% Net Payout** with Day 30 automated escrow disbursement note, and clarifies the 40% platform fee covering trial guarantees and parent onboarding.
- **Month 2+ (Ongoing Classes)**: Highlights **100% Direct Retainer** with 0% platform commission, coordinated directly between parent and tutor.
- **Reactive Recalculation:** The numbers update reactively in real time as the tutor types in the *"Your Offer"* input field.

---

## 2. The 30-Day Milestone Journey

```mermaid
sequenceDiagram
    autonumber
    actor Parent
    participant Platform
    actor Tutor
    actor Referrer
    participant Razorpay

    Note over Parent, Tutor: Milestone 1: Day 0 (Tuition Starts)
    Parent->>Platform: Clicks 'Hire' after demo (/transactions/hire)
    Platform->>Platform: Sets status: tuition_started, startDate: now()
    Tutor->>Parent: Conducts trial classes (Days 1 to 7)

    Note over Parent, Platform: Milestone 2: Days 7 to 9 (Fee Settlement & Grace Window)
    Parent->>Razorpay: Pays 100% Gross Monthly Fee (₹6,000)
    Razorpay->>Platform: Webhook confirms payment (/verify-payment)
    Platform->>Platform: Records gross payment in 'payments'
    Platform->>Platform: Creates Escrow Record in 'tutor_payouts' (₹3,600 locked)
    Platform->>Platform: Locks Referral Reward (₹600) in 'referrals' escrow

    Note over Platform, Tutor: Milestone 3: Days 8 to 30 (Escrow Holding & Delivery)
    Tutor->>Parent: Conducts remaining 3 weeks of monthly tuition
    Note over Platform: If tutor abandons, platform holds the funds to protect parent

    Note over Platform, Tutor: Milestone 4: Day 30 (Month 1 Complete)
    Platform->>Razorpay: Automated Payout API (₹3,600 to Tutor UPI VPA)
    Platform->>Razorpay: Automated Payout API (₹600 to Referrer UPI VPA)
    Razorpay->>Tutor: Instant IMPS / UPI transfer directly to bank account
    Razorpay->>Referrer: Instant IMPS / UPI transfer directly to bank account
    Platform->>Platform: Updates 'tutor_payouts' and 'referrals' status to 'paid', logs UTRs
    Note over Parent, Tutor: Month 2+: Direct offline coordination; zero platform cut
```

---

## 3. Database Architecture: New Collection `tutor_payouts`

### Why a New Collection Is Required
To maintain strict accounting segregation:
1. **`payments`** represents **Accounts Receivable** (incoming customer payments from parents via Razorpay Gateway).
2. **`tutor_payouts`** represents **Accounts Payable & Escrow Custody** (outgoing disbursements to educators via Razorpay Payouts).
Mixing outgoing disbursement lifecycles into the incoming payment ledger creates audit complexity, foreign key confusion, and security risks.

### Schema Specification: `tutor_payouts`

- **Collection Name**: `tutor_payouts`
- **Document ID (`doc.id`)**: Deterministic format `payout_${applicationId}` (to prevent duplicate escrow disbursements on retry or concurrency)
- **Security Rule**: Read accessible only to target tutor (`tutorDocId == request.auth.uid`) or platform admin; writes strictly restricted to backend API routes (`/api/verify-payment`, `/api/payouts/*`).

| Field Name | Type | Expected Values / Format | Description & Business Rules |
| :--- | :--- | :--- | :--- |
| `payoutDocId` | `string` | Deterministic `payout_${applicationId}` | Primary document key. |
| `applicationDocId` | `string` | Foreign key to `applications` | The tuition contract this payout settles. |
| `studentPaymentId` | `string` | `pay_` + alphanumeric | Razorpay payment confirmation receipt ID from Day 7. |
| `tutorDocId` | `string` | Tutor's Auth UID | The educator entitled to the funds. |
| `tutorName` | `string` | Full name string | Denormalized display name. |
| `parentDocId` | `string` | Parent's Auth UID | The parent who paid the tuition fee. |
| `grossAmount` | `number` | Positive integer (e.g. `6000`) | Total tuition fee collected from student. |
| `platformFeeRate` | `number` | `0.40` | Platform commission percentage. |
| `platformFeeAmount`| `number` | Positive integer (e.g. `2400`) | Platform fee deducted ($G \times 0.40$). |
| `tutorShareRate` | `number` | `0.60` | Educator net percentage. |
| `tutorShareAmount` | `number` | Positive integer (e.g. `3600`) | Net funds payable to the tutor ($G \times 0.60$). |
| `referralReward` | `number` | Positive integer (e.g. `600`) | Referral incentive paid from platform cut ($P \times 0.25$). |
| `monthNumber` | `number` | `1` | Strictly denotes Month 1 trial settlement. |
| `status` | `string` | `'escrow_held'`, `'ready_for_payout'`, `'processing'`, `'paid'`, `'disputed'`, `'manual_review'` | Lifecycle state machine. |
| `startDate` | `Timestamp` | Firestore Timestamp | Day 0 hire date. |
| `paidByStudentAt` | `Timestamp` | Firestore Timestamp | Timestamp when student paid on Day 7. |
| `releaseEligibleAt`| `Timestamp` | Firestore Timestamp | Timestamp when funds unlock (`startDate + 30 days`). |
| `payoutMethod` | `string` | `'upi'` \| `'bank_transfer'` | Transfer rail used by Razorpay Payouts. |
| `payoutVpa` | `string` | Valid UPI ID (e.g. `9148018043@upi`) | Target VPA address of the teacher. |
| `razorpayPayoutId` | `string` | `pout_` + alphanumeric or empty `""` | Razorpay Payout transaction identifier. |
| `utrNumber` | `string` | Bank UTR string or empty `""` | Bank transaction reference number for audit. |
| `createdAt` | `Timestamp` | Firestore Timestamp | Escrow creation date. |
| `paidAt` | `Timestamp` | Firestore Timestamp or `null` | Date when funds successfully reached tutor's bank. |

---

## 4. Codebase Zero-Impact Analysis

A critical architectural mandate is that introducing this escrow and payout system **must not break, alter, or destabilize any existing code or user flows**.

### Impact Assessment Across Components

| Codebase Area | Current Implementation | Impact of New Architecture | Risk Level |
| :--- | :--- | :--- | :---: |
| **`web/src/app/api/create-order/route.ts`** | Calculates Day 7 tuition fee from database and opens Razorpay order. | **ZERO CHANGE.** The student continues to pay the exact same 100% gross fee. | 🟢 None |
| **`web/src/app/api/verify-payment/route.ts`** | Verifies signature, updates `payments`, updates `pending_tuition_fees`, and processes referrals. | **NON-INVASIVE EXTENSION.** Inside the existing atomic batch, simply insert one `batch.set(tutorPayoutRef, ...)` to record the escrow. Existing fields and application states remain identical. | 🟢 Low |
| **`web/src/app/api/transactions/hire/route.ts`** | Initiates tuition on Day 0 and sets `startDate: serverTimestamp()`. | **ZERO CHANGE.** `startDate` continues to act as atomic day 0 baseline. | 🟢 None |
| **`web/src/app/dashboard/student/page.tsx`** | Displays 7-day trial timer, pay button, and grace period locks. | **ZERO CHANGE.** Student UI and payment buttons are 100% unaffected. | 🟢 None |
| **`web/src/app/dashboard/teacher/page.tsx`** | Shows active tuitions, scheduled classes, and review scores. | **ADDITIVE ONLY.** Later, a read-only *"Earnings / Escrow"* card can display `₹3,600 (Releases on Day 30)`. No existing elements are touched. | 🟢 None |

---

## 5. Automated Razorpay Payouts (RazorpayX) Integration

### Technical Execution Flow

1. **Prerequisite**: During profile onboarding, the teacher provides their UPI ID (`vpa`), which is saved to their `tutors` document.
2. **Scheduled Trigger (Day 30)**:
   - The 2nd Gen Cloud Function `dailyPayouts` (`functions/src/scheduled/dailyPayouts.ts`) triggers via Cloud Scheduler every midnight at **00:00 IST** (`0 0 * * *`), querying:
     `collection('tutor_payouts').where('status', '==', 'escrow_held').where('releaseEligibleAt', '<=', now)`
   - Also executed via the Next.js runner endpoint `/api/payouts/process`.
3. **Execution & Batch Concurrency**:
   - Uses `BatchManager` strictly capping Firestore writes at 400 operations per batch to prevent transaction limits.
   - Escrow records utilize deterministic document IDs (`payout_${applicationId}`) to ensure complete idempotency.
   - For each eligible document, the backend transitions status to `'processing'` and dispatches an HTTPS request to Razorpay Payouts API:
     ```json
     POST https://api.razorpay.com/v1/payouts
     Authorization: Basic <BASE64(KEY_ID:KEY_SECRET)>
     Content-Type: application/json

     {
       "account_number": "2323230041234567", // Platform RazorpayX Account
       "amount": 360000, // ₹3,600 in paise
       "currency": "INR",
       "mode": "UPI",
       "purpose": "payout",
       "fund_account": {
         "account_type": "vpa",
         "vpa": {
           "address": "teacher_upi@okaxis"
         },
         "contact": {
           "name": "Krishna",
           "email": "teacher@mitutora.in",
           "contact": "9148018043",
           "type": "vendor"
         }
       },
       "queue_if_low_balance": true,
       "reference_id": "MTA1G4DR0_M1_PAYOUT"
     }
     ```
4. **Instant Webhook Settlement**:
   - Razorpay executes the transfer via IMPS/UPI within seconds and posts webhook `payout.processed`.
   - The platform updates `tutor_payouts`:
     - `status: 'paid'`
     - `utrNumber: payload.utr`
     - `paidAt: serverTimestamp()`

### 5.1 Double-Defense Guard: Mandatory Student Fee Verification
Under no circumstances does Day 30 payout execution disburse funds without verified student payment. Both the nightly Cloud Function `dailyPayouts.ts` and the Next.js API runner `/api/payouts/process/route.ts` enforce strict double-defense assertion guards:
- **Tutor Payouts**: Verifies that both `studentPaymentId` (Razorpay payment receipt) and `paidByStudentAt` (payment timestamp) are present on the payout document:
  ```typescript
  if (!payout.studentPaymentId || !payout.paidByStudentAt) {
    console.warn(`Skipping payout ${payout.id}: Student payment unverified.`);
    continue;
  }
  ```
- **Referral Payouts**: Verifies that the referee's status is strictly `'qualified'` and `qualifiedAt` is recorded:
  ```typescript
  if (refData.status !== 'qualified' || !refData.qualifiedAt) {
    console.warn(`Skipping referral payout ${refDoc.id}: Referee has not completed fee payment.`);
    continue;
  }
  ```

### 5.2 Teacher Earnings Dashboard Lifecycle Transparency
In [`web/src/app/dashboard/teacher/page.tsx`](file:///c:/Users/Dell/Desktop/mushi/web/src/app/dashboard/teacher/page.tsx), the **Active Tuitions** milestone status tracker provides complete real-time lifecycle transparency across both Stage 1 (Student Fee) and Stage 2 (Tutor Payout):
1. **Trial in Progress (`daysElapsed < 7`, `!feePaid`)**:
   - Stage 1: Amber clock badge `Due on [Day 7 Date] (Trial Day 7)` with days remaining countdown.
   - Stage 2: Slate calendar badge `Expected: ₹Y on [Day 30 Date]` with `Student Fee Required` pill.
2. **Overdue Grace Period (`7 <= daysElapsed < 20`, `!feePaid`)**:
   - Stage 1: Orange alert badge `Payment Due (Grace Period Active)`.
   - Stage 2: Amber lock badge `Payout on Hold (Awaiting Student Fee)`.
3. **Hard Lock (`daysElapsed >= 20`, `!feePaid`)**:
   - Stage 1: Red alert badge `Overdue - Student Account Locked` (instruction to pause classes).
   - Stage 2: Rose lock badge `Payout Blocked (Student Fee Unpaid) - Day 30 Razorpay transfer will NOT execute unless student clears fee`.
4. **Fee Paid by Student (`feePaid === true`)**:
   - Stage 1: Green checkmark badge `₹X Received by Platform`.
   - Stage 2: Teal lock badge `₹Y Held in Platform Escrow (releasing on Day 30)`.
5. **Day 30 Disbursed**:
   - Stage 2: Green checkmark badge `₹Y Disbursed to UPI` with bank UTR number.

---

## 6. Post-Payment Policy & Strict Zero-Refund Rule

In full alignment with [`Demo_Completion_Hiring_Architecture.md`](./Demo_Completion_Hiring_Architecture.md) and [`Student_Fee_Payment_Architecture.md`](./Student_Fee_Payment_Architecture.md):
- **Pre-Payment Evaluation**: The student has already undergone (1) the live demo class, (2) the 48-hour post-demo evaluation period, and (3) the 7-day live trial with prorated cancellation rights.
- **Strict Zero-Refund**: Once Day 7 is reached and the student submits the monthly tuition fee via Razorpay (`feePaid: true`), the platform enforces a **strict Zero-Refund policy**. 
- **No Post-Payment Disputes**: Because the student had over a week of evaluation before paying, there is no dispute window or hold on the Day 7 payment.
- **The 30-Day Escrow Purpose**: The 30-day timeline (`startDate + 30 days`) represents the natural completion of the Month 1 teaching schedule, at which point the tutor's 60% net share automatically disburses.

---

## 7. Tutor UPI Collection & Fallback Engine

### A. When Is the UPI ID Collected?
- **Primary Collection (Profile Setup)**: The teacher enters their UPI ID (`upiId`) during profile registration in `TeacherForm.tsx` (validated via regex `/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/`).
- **Profile Settings**: The teacher can view or update their UPI ID at any time in their dashboard profile settings.
- **Fail-Safe Missing UPI Handling**: If a teacher has not configured a UPI ID by Day 30, the payout status becomes `'action_required_missing_upi'`, and a prominent alert banner prompts them: *"Your Month 1 payout of ₹X,XXX is ready! Please enter your UPI ID to receive your funds."*

### B. Admin Manual Fallback Mode (Netbanking / CSV Export)

If the platform's RazorpayX account balance is insufficient or if Razorpay experiences third-party banking downtime:
1. **Graceful Queuing**: The Razorpay API parameter `"queue_if_low_balance": true` ensures transfers do not fail; they queue automatically until funded.
2. **Admin CSV Export**:
   - In the Admin Portal, an admin can click **"Export Pending Payouts (CSV)"**.
   - Generates a standard corporate banking bulk-upload file (HDFC/ICICI/SBI format) containing:
     `Beneficiary Name, UPI ID / Account No, IFSC, Amount, Reference Note`.
3. **Manual UTR Reconciliation**:
   - After executing the batch transfer via netbanking, the admin inputs or uploads the UTR sheet.
   - The platform marks records as `'paid'` with the logged UTR numbers.
