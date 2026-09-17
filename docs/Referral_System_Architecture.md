# Referral & Rewards Architecture

This document explains the referral and rewards system on the Mi-Tutora platform, covering the attribution tracking, the mathematical incentive calculation, role-based rewards, and the secure backend qualification engine.

---

## 1. Executive Summary & The Referral Lifecycle

1. **The Referral Code:** Upon registration, every user is assigned a unique personal referral code (e.g. `RAMA-MABTMF`) generated via `generateReferralCode()`.
2. **The Link & Cookie:** The user shares their invite link (`mitutora.com?ref=CODE`). A global listener (`ReferralTracker.tsx`) caches this code in `localStorage`.
3. **Account Attribution:** When the referee registers, a permanent record is established in the `users` collection (`referredBy: CODE`) and a tracking ticket is created in the `referrals` collection with `status: 'pending'`.
4. **The Settlement Trigger (Day 7 Payment):** While the referred friend is in their 7-day trial, the Referrals tracking portal (`ReferralsList.tsx`) displays Stage 4 as `"Awaiting Fee"` with a clear explainer: *"Reward locks into 30-day escrow only when your friend completes the 7-day trial and settles their tuition fee. No payout will occur if fee is unpaid."* When the referred user completes their 7-day trial and pays their first-month tuition fee via Razorpay (`/api/verify-payment`), the referral status advances from `'pending'` to `'qualified'`. The reward amount is calculated and placed in **escrow** (`payoutStatus: 'escrow_held'`).
5. **Role-Based Reward Distribution (Based on Who Joins):**
   - **When a Student Joins via Referral:** The referrer (whether a Student or a Teacher) receives **Cash** ($25\%$ of platform commission, e.g. ₹600 on ₹6,000 tuition) held in escrow until Day 30, then deposited automatically via UPI.
   - **When a Teacher Joins via Referral:** The referrer receives **1 Banked Token** credited to `tutors.bankedTokens` to unlock an extra weekly proposal.
6. **Synchronized Day 30 Automated UPI Payout (Strict Fee Prerequisite):** On Day 30 (`startDate + 30 days`), the platform's automated payout engine disburses the referral cash directly to the referrer's saved UPI ID via Razorpay Payouts simultaneously alongside the tutor's 60% fee. Payout strictly requires that the student fee was verified (`status === 'qualified'` and `qualifiedAt` are verified). There is **zero minimum threshold** (no waiting for ₹1,000) and no manual WhatsApp messaging required.

---

## 2. The Referral Reward Math Formula

The platform operates on a **40% first-month commission model**. The referral reward is strictly funded out of the platform's commission margin:

$$\text{Gross Tuition Fee } (G) = \text{Amount paid by student on Day 7}$$
$$\text{Platform Commission } (P) = G \times 0.40 \quad (40\% \text{ of gross})$$
$$\text{Referral Reward } (R) = P \times 0.25 = G \times 0.10 \quad (25\% \text{ of platform margin} = 10\% \text{ of gross})$$
$$\text{Platform Retained Margin } = P - R = G \times 0.30 \quad (30\% \text{ net retained revenue})$$

### Concrete Calculation Examples

| Monthly Tuition Fee | Platform Fee (40%) | Referrer Cash Reward (Student Joined) | Referrer Token Reward (Teacher Joined) | Platform Net Margin |
| :---: | :---: | :---: | :---: | :---: |
| **₹4,000** | ₹1,600 | **₹400** | +1 Banked Token | ₹1,200 |
| **₹6,000** | ₹2,400 | **₹600** | +1 Banked Token | ₹1,800 |
| **₹8,000** | ₹3,200 | **₹800** | +1 Banked Token | ₹2,400 |
| **₹10,000** | ₹4,000 | **₹1,000** | +1 Banked Token | ₹3,000 |

> **Dashboard Transparency:**  
> This formula matches the exact guarantee displayed on the student dashboard ([`student/page.tsx:L2611`](../web/src/app/dashboard/student/page.tsx#L2611)):  
> *"Earn 25% of the initial company margin (approx. 10% of total course value) when your friend books their first class!"*

---

## 3. Database Schema & State Transitions

### Database Collections Involved

| Step | What happens? | Collection | Fields Used |
| :--- | :--- | :--- | :--- |
| **Identity** | User's unique code & payout UPI | `users` | `referralCode`, `upiId`, `name` |
| **Attribution** | Link between referee and referrer | `referrals` | `referrerId`, `referrerName`, `referredUserId`, `referredUserName`, `referralType`, `status` (`'pending'` \| `'qualified'`), `reward`, `rewardType`, `payoutStatus` (`'escrow_held'` \| `'ready_for_payout'` \| `'processing'` \| `'paid'` \| `'action_required_missing_upi'`), `releaseEligibleAt`, `payoutVpa`, `utrNumber`, `paidAt` |
| **Trigger** | Day 7 tuition payment settlement | `payments` | `applicationDocId`, `status` (`'paid'`), `type` (`'tuition'`) |
| **Automated Payout** | Direct Day 30 transfer to referrer's UPI | `referrals` + Razorpay Payouts API | `payoutVpa`, `utrNumber`, `paidAt` (Disbursed via `/api/payouts/process`) |

---

## 4. End-to-End Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Referrer
    actor Referee
    participant WebApp
    participant Razorpay
    participant Backend as Backend (/api/verify-payment)
    participant PayoutEngine as Payouts Engine (/api/payouts/process)
    participant DB as Cloud Firestore

    Referrer->>Referee: Shares link (mitutora.com?ref=RAMA-MABTMF)
    Referee->>WebApp: Opens website (stores code in localStorage)
    Referee->>WebApp: Registers new account
    WebApp->>DB: Creates user (referredBy: RAMA-MABTMF)
    WebApp->>DB: Creates ticket in 'referrals' (status: 'pending')

    Note over Referee, Backend: Days 0 to 7: Live Trial Completed
    Referee->>Razorpay: Pays Month 1 Tuition Fee (₹6,000)
    Razorpay->>Backend: Webhook confirms payment signature
    
    Note over Backend: Server computes: Platform Fee = ₹2,400 | Referrer Reward = ₹600 | Tutor Share = ₹3,600
    Backend->>DB: Updates 'referrals' ticket: status = 'qualified', reward = 600, payoutStatus = 'escrow_held'
    Backend->>DB: Creates 'tutor_payouts' record: status = 'escrow_held', amount = 3600
    
    alt Referred User is a Teacher
        Backend->>DB: Increments tutors.bankedTokens by 1 (Token Award)
    end

    Note over PayoutEngine, DB: Day 30 Arrives (startDate + 30 days)
    PayoutEngine->>DB: Queries eligible payouts (status: 'escrow_held' & releaseEligibleAt <= now)
    PayoutEngine->>Razorpay: Disburses ₹3,600 to Tutor's UPI
    PayoutEngine->>Razorpay: Disburses ₹600 to Referrer's UPI
    Razorpay-->>PayoutEngine: Returns UTR numbers
    PayoutEngine->>DB: Updates 'tutor_payouts' & 'referrals' status = 'paid'
```

---

## 5. Security & Anti-Fraud Locks

1. **Server-Side Authorization & Auth Trigger (`onUserCreated`):** Referral tracking tickets are handled via the 2nd Gen Firebase Auth trigger (`functions/src/triggers/onUserCreated.ts`). When a user signs up, the trigger checks `referredBy`, validates the code against existing users, rejects self-referrals, and initializes the `referrals` document.
2. **Self-Referral Prevention:** Users cannot refer themselves (`referrerId !== referredUserId`).
3. **Single Qualification Lock:** The backend query explicitly filters for `status == 'pending'`. Once marked `'qualified'`, a referral can never trigger a second reward.
4. **Escrow Safety Lock:** Funds are held in escrow until Day 30 (`startDate + 30 days`), preventing any payout leakage if a class is discontinued during the 7-day trial.
5. **Direct UPI Validation & Payout Runner (`dailyPayouts`):** Referrer UPI IDs are validated via regex format check (`/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/`) before disbursement. The nightly Cloud Scheduler runner `dailyPayouts` disburses matured referral rewards directly to UPI. If missing, the status safely transitions to `'action_required_missing_upi'`.
6. **Banked Token Redemption (`redeemBankedToken`):** When a teacher is referred, the earned banked token can be redeemed 1:1 for active proposals via the callable function `redeemBankedToken` with atomic write locks.
7. **Mandatory Fee Settlement Prerequisite:** The Day 30 payout runner (`dailyPayouts` and `/api/payouts/process`) explicitly asserts `refData.status === 'qualified'` and verifies `refData.qualifiedAt`. If the referee has not settled their Day 7 tuition fee, no referral reward is disbursed.

