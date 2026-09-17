# Mi-Tutora — Platform Business & Technical Architecture

Welcome to the **Mi-Tutora** codebase. Mi-Tutora is an advanced ed-tech marketplace connecting **Students/Parents** with verified **Home & Online Tutors** across School Academics, Competitive Exams, Programming, and Spoken Languages.

This master documentation serves as the comprehensive architectural overview of the entire platform, consolidating the core principles, state machines, financial mathematics, anti-spam protections, and database models defined across the specification documents in the [`docs/`](./docs) directory.

---

## Table of Contents
1. [The Big Picture: 5-Phase Lifecycle](#1-the-big-picture-5-phase-lifecycle)
2. [Student Onboarding & 1:N Grouping Architecture](#2-student-onboarding--1n-grouping-architecture)
3. [Matchmaking & Ranking Engine (Server-Side + 20-Card Lazy Loading)](#3-matchmaking--ranking-engine)
4. [Discovery, Token Quotas & Pro Subscriptions](#4-discovery-token-quotas--pro-subscriptions)
5. [Trust & Safety: Aadhar KYC Verification](#5-trust--safety-aadhar-kyc-verification)
6. [Real-time 2-Way Negotiation](#6-real-time-2-way-negotiation)
7. [Demo Class Scheduling & 48-Hour Decision Window](#7-demo-class-scheduling--48-hour-decision-window)
8. [The 7-Day Trial & Mandatory Fee Settlement](#8-the-7-day-trial--mandatory-fee-settlement)
9. [First-Month Tuition Escrow & Automated Day 30 Payouts](#9-first-month-tuition-escrow--automated-day-30-payouts)
10. [Referral & Rewards Engine (Automated UPI Deposition)](#10-referral--rewards-engine-automated-upi-deposition)
11. [Review & Rating Engine](#11-review--rating-engine)
12. [Anti-Spam & Rate Limiting Rules](#12-anti-spam--rate-limiting-rules)
13. [Database Architecture & Entity-Relationship Model](#13-database-architecture--entity-relationship-model)
14. [Firebase Cloud Functions (2nd Gen) & Cloud Scheduler Architecture](#14-firebase-cloud-functions-2nd-gen--cloud-scheduler-architecture)
15. [Master Documentation Index](#15-master-documentation-index)

---

## 1. The Big Picture: 5-Phase Lifecycle

At its core, Mi-Tutora operates on a **First-Month Intermediation Model**. The platform guarantees quality, trial safety, and escrow protection during onboarding and the initial month of tuition. Subsequent months (Month 2+) transition directly between parents and tutors offline without platform deductions.

```mermaid
stateDiagram-v2
    state "1. Onboarding & Grouping" as Phase1 {
        ParentSignsUp --> AddsLearners
        AddsLearners --> ClustersGroup
    }
    
    state "2. Discovery & Negotiation" as Phase2 {
        ClustersGroup --> StrictFilterMatch
        StrictFilterMatch --> ScoreRanking
        ScoreRanking --> TwoWayNegotiation
        TwoWayNegotiation --> PriceAgreed
    }
    
    state "3. Demo Phase" as Phase3 {
        PriceAgreed --> TeacherPaysDemoFee
        TeacherPaysDemoFee --> DemoScheduled
        DemoScheduled --> DemoConducted
        DemoConducted --> TeacherMarksFinished
    }
    
    state "4. 48h Hiring Decision" as Phase4 {
        TeacherMarksFinished --> 48hDecisionWindow
        48hDecisionWindow --> Hired_TuitionStarted
        48hDecisionWindow --> Rejected_AutoDeclined
    }
    
    state "5. Trial, Grace Period, Settlement & Day 30 Payout" as Phase5 {
        Hired_TuitionStarted --> Day0_6_Trial
        Day0_6_Trial --> Discontinued_ProratedFee : Days 1-6 (Early Cancellation & Persistent Reminders)
        Day0_6_Trial --> Days7_19_GracePeriod : Days 7-19 (Popup Active, Full Portal Access)
        Days7_19_GracePeriod --> Day20_HardLock : Day 20+ (Portal Locked)
        Days7_19_GracePeriod --> Day30_EscrowPeriod : Fee Paid
        Day20_HardLock --> Day30_EscrowPeriod : Fee Paid
        Day30_EscrowPeriod --> Day30_DualUPIPayout : Day 30
    }

    Phase1 --> Phase2
    Phase2 --> Phase3
    Phase3 --> Phase4
    Phase4 --> Phase5
```

---

## 2. Student Onboarding & 1:N Grouping Architecture
*Full Specification: [`docs/Student_Grouping_Architecture.md`](./Student_Grouping_Architecture.md)*

*   **The Group Concept:** Every student registered under a parent account belongs to a **Group** (`groups` collection).
    *   **Single Learner:** Created in an individual group (`isGroup: false`).
    *   **Multiple Learners:** A parent can cluster siblings or friends into a shared tuition group (`isGroup: true`) with unified scheduling and budget.
*   **Why Groups?** Educators do not bid on individual children; they apply to the **Group**. This allows batch-teaching and group pricing discounts while preserving individual learner performance tracking.

---

## 3. Matchmaking & Ranking Engine
*Full Specification: [`docs/Ranking_System_Architecture.md`](./Ranking_System_Architecture.md)*

When a student group is posted, teachers are sorted using a rigorous two-layer matchmaking algorithm:

### Layer 1: Strict Boolean Filter (`isStrictMatch`)
A teacher is completely hidden unless **100% of strict conditions match**:
1. **Teaching Category:** Must match (`'school'`, `'competitive'`, `'programming'`, `'languages'`).
2. **Board:** Must match student board (CBSE, ICSE, State, etc.) for school categories.
3. **Class Level:** Teacher must support student's grade level.
4. **Gender Preference:** If parent specified Male/Female, teacher must match.
5. **Subject Coverage:** Teacher must offer **100%** of subjects requested by the student group.
6. **Delivery Mode:** Must match (`'Online'` vs `'Offline'`). Online educators will never see offline student inquiries in recommendations, and vice versa.

### Layer 2: Suitability Scoring Matrix (Max 230+ Points)
Eligible teachers are ranked dynamically based on weighted parameters:
*   **+50 points per matching subject**
*   **+30 points for exact class level match**
*   **+20 points for board match**
*   **Up to +30 points for budget match:** Calculated as `30 * (1 - |TeacherFee - StudentBudget| / StudentBudget)`.
*   **+10 to +30 points Offline Proximity Match (Haversine Formula):**
    For in-person tuition (`mode: 'offline'`), geographic distance between student group coordinates and teacher coordinates is computed:
    - $\le 3$ km: **+30 points** (Neighborhood tier)
    - $3.1 - 6$ km: **+20 points** (Local tier)
    - $6.1 - 10$ km: **+10 points** (Extended city radius)
    - $> 10$ km: **+0 points**
    - *Pure Online Isolation:* If a student requests `'Online'` tuition, proximity calculation is completely bypassed (`+0` points), keeping online recommendations 100% academic-focused.
    - *Location Detection Engine:* Client-side auto-detect leverages the zero-setup, zero-cost **BigDataCloud Free Reverse Geocoding API** for high-accuracy locality mapping, with OpenStreetMap Nominatim search serving as the fallback when addresses are typed manually.
*   **+20 points Trust Boost for Verified Aadhar KYC**
*   **+20 points Visibility Boost for Active Pro Subscription**

### Discovery Cards: Google Maps View for Offline Tuitions
To allow instant physical feasibility assessment without opening cards:
*   **Strictly Offline Gate:** Evaluates `mode === 'offline'`. Excluded entirely for online tuitions.
*   **Option B Placement:** Positioned directly above the action buttons (`[ View ]` and `[ Request Demo / Make Offer ]`) as a full-width pill button.
*   **Universal Direct Search:** Launches Google Maps in a new tab via exact coordinates (`query=${lat},${lng}`) or geocoded locality text (`query=${encodeURIComponent(`${area}, ${city}`)}`) at zero API cost. Styled cleanly with Lucide icons (`MapPin`, `ExternalLink`) and zero emojis.

### Server-Side Ranking Engine & 20-Card Lazy Loading
To ensure instantaneous page loads and eliminate browser lag without exposing proprietary ranking algorithms:
*   **Server-Side Execution (`getRankedTutors` & `getRankedStudents`):** 100% of scoring and filtering runs in 2nd Gen Firebase Cloud Functions callable endpoints invoked via `dashboardApi.ts` using `httpsCallable`.
*   **Global Rank #1 Guarantee:** All candidate profiles are evaluated and sorted in descending order of total score *before* pagination. Rank #1 is always the highest-scoring candidate globally, never missed due to shallow querying.
*   **20-Card Paginated Chunks (`page`, `pageSize: 20`):** The client requests `page=1` initially (20 cards) and retrieves subsequent 20-card slices via the **"Load More"** trigger as the user scrolls, saving bandwidth and Firestore read quotas.

### Discovery Feed: Profile-Gated Views
To ensure maximum lead relevance while maintaining a seamless onboarding flow:
*   **Before Profile Setup (`!hasProfile`):** Users explore the entire catalog ("All Students" / "All Tutors") with a banner prompt encouraging them to configure their subjects and category. The manual subtab toggle pill is hidden.
*   **After Profile Setup (`hasProfile`):** The New Tuition discovery feed transitions exclusively to algorithmic recommendations ("Recommended Students" / "Recommended Tutors"), removing the "All" section and toggle pill so users only interact with qualified matches.

---

## 4. Discovery, Token Quotas & Pro Subscriptions
*Full Specification: [`docs/Subscription_Architecture.md`](./Subscription_Architecture.md)*

To prevent lead exhaustion and maintain high application quality, teachers operate under a weekly proposal token quota:
*   **Free Tier:** 5 tokens per week.
*   **Pro Tier (₹299 / month):** 15 tokens per week, +20 ranking algorithm boost, and a Pro badge.
*   **Weekly Rollover Cron (`weeklyQuotaReset`):** Quotas reset every **Monday at 00:00 IST** via a dedicated Cloud Scheduler function, executing batched writes with 400-op safety limits.
*   **Banked Token Redemption (`redeemBankedToken`):** Tutors can redeem referral-earned banked tokens into their active proposal quota via a dedicated 2nd Gen callable Cloud Function protected by atomic transaction checks.
*   **Anti-Clock Spoofing:** Expiry timestamps are strictly enforced server-side via Firebase Admin SDK `Timestamp.now()`, rendering client clock manipulation ineffective.

---

## 5. Trust & Safety: Aadhar KYC & Educational Document Verification
*Full Specifications: [`docs/Aadhar_Verification_Badge.md`](./Aadhar_Verification_Badge.md), [`docs/Document_Verification.md`](./Document_Verification.md)*

### A. Aadhar Identity KYC
*   **Live Gov API Integration:** Integrates with PowerAPI OTP verification API (with mock fallback for testing).
*   **Secure Masking:** Only the last 4 digits (`XXXX-XXXX-1234`) are retained in Firestore for display; full Aadhar numbers are never permanently stored.
*   **Trust Badge & Algorithm Boost:** Verified educators receive the green verified shield badge and an automatic **+20 ranking boost**.

### B. Teacher Resume & Optional Educational Document Verification
*   **Compulsory Resume/CV Onboarding:** Tutors must upload their resume/CV during profile setup. Proposals (`make_offer` or direct demo requests) are unlocked once the resume is on file.
*   **Optional Dynamic Qualification Mapping:** Tutors may optionally upload official educational marksheets/certificates corresponding to their highest qualification (e.g., 10th marksheet for 10th; 10th + 12th for 12th; degree certificate for bachelor degrees; master certificates for post-graduates) to build parent trust.
*   **Strict PDF Restrictions:** Frontend and Firebase Storage rules restrict document uploads strictly to **PDF format** (`.pdf`) capped at **5MB** per file.
*   **Secure Firebase Storage Scheme:** Files are stored under `tutor_documents/{userId}/{docId}_{timestamp}_{fileName}` with owner-only write permissions.

---

## 6. Real-time 2-Way Negotiation
*Full Specification: [`docs/Negotiation_Architecture.md`](./Negotiation_Architecture.md)*

*   **Unified Counter-Offer Ledger:** Both Student and Teacher dashboards synchronize on a single `applications.currentOffer` field.
*   **2-Way Haggling:** Either party can submit counter-offers with price bounds (₹100 to ₹100,000) or propose alternate class timing slots.
*   **Instant Acceptance:** When either party clicks "Accept Offer", the agreed figure locks into `finalPrice`, moving the state immediately to the Demo Phase.

---

## 7. Demo Class Scheduling & 48-Hour Decision Window
*Full Specification: [`docs/Demo_Completion_Hiring_Architecture.md`](./Demo_Completion_Hiring_Architecture.md), [`docs/Link_Validation_Demo_Architecture.md`](./Link_Validation_Demo_Architecture.md)*

1. **Commitment Demo Fee:** To eliminate frivolous applications, the teacher pays a nominal demo platform fee (₹99 to ₹299 based on category) to schedule the trial class.
2. **Link Validation:** Video links (Google Meet, Zoom) are strictly sanitized and validated against official regex patterns before saving.
3. **Explicit Completion:** After the trial class occurs, the teacher explicitly clicks "Mark Demo as Finished", setting `status: 'waiting_for_parent_decision'`.
4. **Hourly Automated Expiry (`expireDemosAndDecisions`):** Running hourly (`0 * * * *`, IST), this Cloud Scheduler job automatically transitions scheduled demos whose scheduled meeting time passed 24h ago without manual teacher confirmation to `waiting_for_parent_decision` (stamping `demoCompletedAt: serverTimestamp()`), and auto-declines applications where parents took no hiring decision within the 48-hour window.

---

## 8. The 7-Day Trial, 13-Day Grace Period & Mandatory Fee Settlement
*Full Specification: [`docs/Student_Fee_Payment_Architecture.md`](./Student_Fee_Payment_Architecture.md), [`docs/Payment_Architecture.md`](./Payment_Architecture.md)*

When the parent clicks "Hire", tuition officially starts (`tuition_started`). A 7-day live trial countdown begins:
*   **Cancellation on Days 1 to 6 (Prorated Fee & Persistent Reminders):** If dissatisfied before Day 7, the parent can discontinue by paying only for the exact days utilized:
    $$\text{Prorated Fee} = \left(\frac{\text{Monthly Fee}}{30}\right) \times \text{Days Elapsed}$$
    The platform records `cancellationRequested: true`. If the parent dismisses the checkout modal, persistent overview banners and pop-up reminders continue prompting settlement of the prorated fee or withdrawal of the cancellation.
*   **Days 7 to 19: 13-Day Grace Period (Dismissible Pop-Up & Full Portal Access):**
    *   On portal load, an automatic **"Monthly Tuition Fee Due"** reminder pop-up prompts the student to settle the monthly fee with a dynamic countdown of remaining days (`{20 - daysElapsed} days remaining`).
    *   The student can dismiss the pop-up (`✕` or "Remind Me Later") to continue using and navigating all dashboard tabs without lockout.
    *   Clicking "Pay Monthly Fees" launches the secure Razorpay checkout overlay.
*   **Day 20+: Hard Account Lock:**
    *   If the 13 grace days pass without payment (`daysElapsed >= 20`), the account enters hard lock.
    *   All sidebar navigation tabs and dashboard content are locked (`🔒` lock icons, dimmed styling, and disabled clicks).
    *   The student must click "Pay Monthly Fees Securely" to complete payment via Razorpay and restore full access.
*   **Teacher Earnings Real-Time Visibility (`teacher/page.tsx`):**
    *   While student is in trial (Days 1–7), the teacher sees Stage 1 *Due on Day 7* and Stage 2 *Expected on Day 30* with *Student Fee Required* status.
    *   If student initiates early cancellation, teacher is alerted with *Cancellation Requested* to pause classes.
    *   During Grace Period (Days 7–19), displays *Payment Due (Grace Period)* and *Payout on Hold (Awaiting Student Fee)*.
    *   In Hard Lock (Day 20+), displays *Account Locked* and *Payout Blocked*, advising tutor to pause classes until dues are cleared.
    *   Once student pays, displays *₹X Received by Platform* and *₹Y Held in Platform Escrow* releasing on Day 30.
*   **Strict Zero-Refund Policy:** Once the tuition fee is paid, **no refunds are permitted**. If the parent disconnects after paying, the full fee is retained to protect teacher earnings.

---

## 9. First-Month Tuition Escrow & Automated Day 30 Payouts
*Full Specification: [`docs/First_Month_Tuition_Escrow_Payout_Architecture.md`](./First_Month_Tuition_Escrow_Payout_Architecture.md)*

On Day 7, the full tuition payment is atomically split and placed in custody:
$$\text{Gross Tuition Fee } (G) = \text{100\% Paid on Day 7 (e.g. ₹6,000)}$$
$$\text{Platform Commission } (P) = G \times 0.40 = \text{₹2,400 (40\%)}$$
$$\text{Tutor Escrow Share } (T) = G \times 0.60 = \text{₹3,600 (60\% locked in } \texttt{tutor\_payouts}\text{)}$$
$$\text{Referral Escrow Reward } (R) = P \times 0.25 = \text{₹600 (25\% of platform cut locked in } \texttt{referrals}\text{)}$$
$$\text{Platform Net Retained Margin } = P - R = \text{₹1,800 (30\%)}$$

```
Day 7 (Payment)                Days 8–30 (Escrow)              Day 30 (Automated Payout)
┌───────────────────────┐      ┌─────────────────────────┐     ┌────────────────────────────────┐
│ Parent pays ₹6,000    │ ───► │ Platform holds ₹3,600   │ ──► │ Automated RazorpayX Transfer:  │
│ via Razorpay Checkout │      │ in tutor escrow & ₹600  │     │ • ₹3,600 to Tutor's UPI ID     │
└───────────────────────┘      │ in referral escrow      │     │ • ₹600 to Referrer's UPI ID    │
                               └─────────────────────────┘     │ • Platform keeps ₹1,800 net    │
                                                               └────────────────────────────────┘
```

*   **Automated Day 30 Dual-Payout Scheduler (`dailyPayouts`):** Triggered every night at **00:00 IST**, this Cloud Scheduler job processes all matured Day 30 tuitions (`startDate + 30 days`), transferring tutor and referral earnings via the Razorpay Payouts API.
*   **Strict Fee Prerequisite Verification Guard:** Payouts strictly require that student tuition payment is verified on the record (`studentPaymentId` and `paidByStudentAt` on `tutor_payouts`; `refData.status === 'qualified'` and `qualifiedAt` on `referrals`). The automated engine skips any record missing verified student payment, completely preventing unauthorized disbursements.
*   **Batch & Concurrency Safety:** Uses a custom `BatchManager` strictly capping Firestore writes at 400 operations per batch, with deterministic document IDs (`payout_${applicationId}`) to prevent duplicate disbursements.
*   **Missing UPI Safety Fallback:** If either party has not configured their UPI ID, the system flags `action_required_missing_upi` independently without blocking the other disbursement.
*   **Admin Bulk CSV Fallback (`/api/admin/payouts/export-csv`):** Enables admins to download a banking-ready CSV listing all pending tutor and referrer payouts for manual corporate netbanking.

---

## 10. Referral & Rewards Engine (Automated UPI Deposition)
*Full Specification: [`docs/Referral_System_Architecture.md`](./Referral_System_Architecture.md)*

*   **Attribution & Auth Trigger (`onUserCreated`):** Every user receives an alphanumeric referral code. When a new user signs up, the 2nd Gen Auth trigger validates the referral code, rejects self-referrals, and creates the tracking record in Firestore.
*   **Role-Based Rewards (Based on who joins):**
    *   **When a Student Joins:** Referrer (Student or Teacher) earns **25% of company margin (₹600 on ₹6,000 tuition)** deposited automatically on Day 30.
    *   **When a Teacher Joins:** Referrer earns **+1 Banked Token** to unlock proposals.
*   **Zero Threshold & No WhatsApp:** The legacy manual WhatsApp withdrawal and ₹1,000 threshold have been abolished. Referral cash is automatically deposited directly to the user's UPI on Day 30.

---

## 11. Review & Rating Engine
*Full Specification: [`docs/Review_Architecture.md`](./Review_Architecture.md)*

*   **Eligibility:** Only parents who have an active or completed tuition agreement with a tutor can submit reviews.
*   **Serverless Reactive Trigger (`onReviewCreated`):** Upon review document creation in Firestore, a 2nd Gen trigger executes an atomic transaction calculating the weighted rolling average and updating `rating` and `reviewCount` on the tutor document:
    $$\text{New Average} = \frac{(\text{Current Average} \times \text{Review Count}) + \text{New Rating}}{\text{Review Count} + 1}$$
*   **Trust Display:** The resulting rating and review count are publicly showcased across discovery cards and tutor profiles.

---

## 12. Anti-Spam & Rate Limiting Rules
*Full Specification: [`docs/Student_Queue_Architecture.md`](./Student_Queue_Architecture.md)*

To ensure a fair marketplace and prevent spam, strict architectural limits are enforced:
1. **Concurrent Request Limit:** A student group can have a maximum of **5 concurrent pending requests/offers** at any one time.
2. **2-Demo Anti-Spam Limit:** A student group can have at most **2 active demos** within any 7-day sliding window.
3. **7-Day Post-Decline Lockout:** If a parent declines a tutor's offer, that tutor is locked from submitting another offer to that same student group for **7 days**.
4. **Auto-Declining Competing Leads:** The instant a student hires a tutor, all competing applications for that group are automatically declined with `reason: 'student_hired_another_tutor'`.

---

## 13. Database Architecture & Entity-Relationship Model
*Full Specification: [`docs/Database_Architecture.md`](./Database_Architecture.md)*

The platform is backed by **Google Cloud Firestore**. The high-level entity relationships connecting users, learners, applications, payments, and payouts are modeled below:

```mermaid
erDiagram
    USERS ||--o| PARENTS : "authUid == parentDocId"
    USERS ||--o| TUTORS : "authUid == tutorDocId"
    PARENTS ||--o{ STUDENTS : "parentDocId owns students"
    PARENTS ||--o{ GROUPS : "parentDocId owns groups"
    GROUPS ||--|{ STUDENTS : "studentDocIds array"
    GROUPS ||--o| TUITION_REQUESTS : "groupDocId 1:1 sync"
    
    PARENTS ||--o{ APPLICATIONS : "parentDocId"
    TUTORS ||--o{ APPLICATIONS : "tutorDocId"
    GROUPS ||--o{ APPLICATIONS : "groupDocId"
    
    APPLICATIONS ||--o{ PAYMENTS : "applicationDocId"
    APPLICATIONS ||--o| TUTOR_PAYOUTS : "applicationDocId (60% escrow)"
    APPLICATIONS ||--o| PENDING_TUITION_FEES : "applicationDocId"
    APPLICATIONS ||--o{ REVIEWS : "applicationDocId"
    
    USERS ||--o{ REFERRALS : "referrerId / referredUserId"
    USERS ||--o{ PAYMENTS : "userId (ledger owner)"
```

### Active Firestore Collections Summary

| # | Collection Name | Purpose & Security Scope | Primary Key (`doc.id`) | Full Documentation Link |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `users` | Auth accounts, RBAC roles, `upiId`, and referral codes. | Auth UID | [`docs/Database_Architecture.md#21-collection-users`](./Database_Architecture.md) |
| 2 | `parents` | Parent profiles, phone/WhatsApp contacts. | Auth UID | [`docs/Database_Architecture.md#22-collection-parents`](./Database_Architecture.md) |
| 3 | `tutors` | Teacher profiles, categories, fees, `preferredLocations`, `travelDistance`, `upiId`, tokens, KYC, `verificationDocs`, `verificationStatus`. | Auth UID | [`docs/Database_Architecture.md#23-collection-tutors`](./Database_Architecture.md) |
| 4 | `students` | Individual learners, grade levels, boards, subjects. | Auto ID | [`docs/Database_Architecture.md#24-collection-students`](./Database_Architecture.md) |
| 5 | `groups` | Multi-student learning clusters and joint budgets. | Auto ID | [`docs/Database_Architecture.md#25-collection-groups`](./Database_Architecture.md) |
| 6 | `tuition_requests` | Real-time marketplace listings created from groups. | Auto ID | [`docs/Database_Architecture.md#26-collection-tuition_requests`](./Database_Architecture.md) |
| 7 | `applications` | 2-way negotiations, demo scheduling, tuition states; includes `privateData/meeting` video link vault. | Auto ID | [`docs/Database_Architecture.md#27-collection-applications`](./Database_Architecture.md) |

| 8 | `payments` | Incoming payment records (demo fees, tuition, pro plans). | Auto ID | [`docs/Database_Architecture.md#28-collection-payments`](./Database_Architecture.md) |
| 9 | `pending_tuition_fees` | Fallback ledger for pending Day 7 trial completions. | Auto ID | [`docs/Database_Architecture.md#29-collection-pending_tuition_fees`](./Database_Architecture.md) |
| 10 | `referrals` | Referral tracking, Day 30 cash escrow, banked tokens. | Auto ID | [`docs/Database_Architecture.md#210-collection-referrals`](./Database_Architecture.md) |
| 11 | `reviews` | Star ratings and student feedback on completed tuitions. | Auto ID | [`docs/Database_Architecture.md#211-collection-reviews`](./Database_Architecture.md) |
| 12 | `marketplace_pricing` | Dynamic demo fee pricing rules by category. | Auto ID | [`docs/Database_Architecture.md#212-collection-marketplace_pricing`](./Database_Architecture.md) |
| 13 | `global_config` | Platform maintenance flags and global settings. | Fixed Doc | [`docs/Database_Architecture.md#213-collection-global_config`](./Database_Architecture.md) |
| 14 | `tutor_payouts` | Month 1 60% tuition escrow holding & Day 30 disbursements. | Auto ID | [`docs/Database_Architecture.md#216-collection-tutor_payouts`](./Database_Architecture.md) |

---

---

## 14. Firebase Cloud Functions (2nd Gen) & Cloud Scheduler Architecture
*Full Specification: [`docs/Cloud_Functions_Migration_Plan.md`](./Cloud_Functions_Migration_Plan.md)*

Critical platform automation, ranking computation, escrow payouts, and asynchronous triggers are decoupled from the browser and executed in secure, isolated serverless containers using **Firebase Cloud Functions (2nd Gen)** deployed to the **Mumbai region (`asia-south1`)**.

```
                           ┌────────────────────────────────────────────────────────┐
                           │            Firebase Cloud Functions (2nd Gen)           │
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

### Complete Cloud Functions Catalog

| Category | Function Name | Trigger / Schedule | Primary Responsibility | Security & Concurrency Boundary |
| :--- | :--- | :--- | :--- | :--- |
| **Scheduled Runner** | `weeklyQuotaReset` | Every Monday `00:00 IST` (`0 0 * * 1`) | Resets tutor weekly proposal quotas (Free: 5, Pro: 15). | `BatchManager` (400-op chunks), Server-side Admin SDK |
| **Scheduled Runner** | `dailyPayouts` | Every Night `00:00 IST` (`0 0 * * *`) | Processes Day 30 matured escrow payouts (Tutor 60%, Referrer 25%) via RazorpayX. | Deterministic doc ID `payout_${appId}`, idempotency guards |
| **Scheduled Runner** | `expireDemosAndDecisions` | Hourly (`0 * * * *`, IST) | Auto-completes expired demo sessions and auto-declines 48h inactive hiring decisions. | Batch transaction limits, strict IST timezone offset |
| **Callable API** | `redeemBankedToken` | `onCall` (Auth required) | Converts 1 referral banked token into an active weekly proposal credit. | Atomic Firestore transaction, zero-credit lock |
| **Callable API** | `deleteUserAccount` | `onCall` (Auth required) | Safely anonymizes account, blocks deletion if active tuition exists. | Atomic multi-document checks, auth revocation |
| **Callable API** | `getRankedTutors` | `onCall` (Public/Auth) | Evaluates 100% of tutors, applies strict filters & suitability scoring, returns 20-card slices. | Server-side IP rate limiting, algorithmic concealment |
| **Callable API** | `getRankedStudents` | `onCall` (Tutor Auth) | Evaluates 100% of student posts, applies subject/board/budget scoring, returns 20-card slices. | Proposal quota checks, token balance verification |
| **Reactive Trigger** | `onUserCreated` | `auth.user().onCreate` | Validates referral code, prevents self-referrals, establishes referral ledger record. | Cloud Functions Gen 2 Auth event |
| **Reactive Trigger** | `onReviewCreated` | `firestore.onDocumentCreated` | Recalculates rolling star average on tutor profile when a review is submitted. | Atomic transaction on `tutors/{tutorId}` |
| **Reactive Trigger** | `onApplicationWritten` | `firestore.onDocumentWritten` | Auto-declines competing applications when a tutor is hired; decrements active queues. | Event-driven idempotent queue pruning |
| **Secure Webhook** | `handleRazorpayWebhook` | `onRequest` (HTTPS POST) | Ingests payment captures, validates HMAC SHA-256 signatures, activates tuitions/escrow. | Optimistic concurrency lock on `payments/{orderId}` |

---

## 15. Master Documentation Index

For detailed deep-dives into specific platform subsystems, refer to the corresponding documents in the [`docs/`](./) folder:

| Subsystem / Feature Area | Detailed Architecture Specification |
| :--- | :--- |
| **Complete Database Schema & ER Model** | 👉 [`docs/Database_Architecture.md`](./Database_Architecture.md) |
| **Cloud Functions (2nd Gen) & Serverless Migration** | 👉 [`docs/Cloud_Functions_Migration_Plan.md`](./Cloud_Functions_Migration_Plan.md) |
| **Educational Document Verification Architecture** | 👉 [`docs/Document_Verification.md`](./Document_Verification.md) |
| **Escrow & Day 30 Automated Razorpay Payouts** | 👉 [`docs/First_Month_Tuition_Escrow_Payout_Architecture.md`](./First_Month_Tuition_Escrow_Payout_Architecture.md) |
| **Referrals, Banked Tokens & Automated UPI Rewards** | 👉 [`docs/Referral_System_Architecture.md`](./Referral_System_Architecture.md) |
| **Student Tuition Payment & Zero-Refund Policy** | 👉 [`docs/Student_Fee_Payment_Architecture.md`](./Student_Fee_Payment_Architecture.md) |
| **Payment Gateway & Webhook Verification** | 👉 [`docs/Payment_Architecture.md`](./Payment_Architecture.md) |
| **Matchmaking & Ranking Algorithm** | 👉 [`docs/Ranking_System_Architecture.md`](./Ranking_System_Architecture.md) |
| **Subscriptions, Pro Plan & Weekly Quota Rollover** | 👉 [`docs/Subscription_Architecture.md`](./Subscription_Architecture.md) |
| **Anti-Spam Limits & Student Queue Management** | 👉 [`docs/Student_Queue_Architecture.md`](./Student_Queue_Architecture.md) |
| **Demo Class Completion & 48-Hour Decision Window** | 👉 [`docs/Demo_Completion_Hiring_Architecture.md`](./Demo_Completion_Hiring_Architecture.md) |
| **Two-Way Price & Time Negotiation** | 👉 [`docs/Negotiation_Architecture.md`](./Negotiation_Architecture.md) |
| **Student Grouping & Batch Clustering** | 👉 [`docs/Student_Grouping_Architecture.md`](./Student_Grouping_Architecture.md) |
| **Aadhar KYC OTP Verification & Masking** | 👉 [`docs/Aadhar_Verification_Badge.md`](./Aadhar_Verification_Badge.md) |
| **Tutor Ratings & Reviews Calculation** | 👉 [`docs/Review_Architecture.md`](./Review_Architecture.md) |
| **Video Meeting Link Validation** | 👉 [`docs/Link_Validation_Demo_Architecture.md`](./Link_Validation_Demo_Architecture.md) |
| **Authentication & RBAC Routing** | 👉 [`docs/Authentication.md`](./Authentication.md) |
| **Custom ID Generation (`MTT`, `MTP`, `MTS`, `MTG`)** | 👉 [`docs/Document_ID.md`](./Document_ID.md) |
| **RazorpayX Payouts Setup & Manual Testing Guide** | 👉 [`docs/Payouts.md`](./Payouts.md) |

---

## Test Suite & Verification

The architecture and business rules are protected by an automated end-to-end test suite in [`web/tests/`](../web/tests) and TypeScript compilation in both Next.js and Firebase Cloud Functions:

```bash
# Run all 19 test suites (210 passed unit, integration, escrow, time format & ranking tests)
cd web
npx playwright test

# Check TypeScript type safety across web
npx tsc --noEmit

# Build and verify Firebase Cloud Functions (2nd Gen)
cd ../../functions
npm run build
```

*All automated tests pass with 0 errors across 19 test suites (210 passed tests), validating the mathematical split, escrow lifecycle, server-side matching & 20-card pagination, 12-hour AM/PM time conversions, and offline travel preferences.*


