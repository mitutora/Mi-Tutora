# Teacher Subscription & Quota Architecture

This document outlines the business rules and technical architecture for the Teacher Subscription system. The model is designed to drive revenue by creating strategic friction for Free-tier users while rewarding them for upgrading.

---

## 1. The Core Strategy: The "Token" Quota System
To maximize paid upgrades, the platform uses an industry-standard "Strict Quota" model (similar to Upwork Connects or LinkedIn InMails) rather than a concurrent queue. 

**The Golden Rule:** Every time a Teacher sends an offer or requests a demo, they spend a "Token". Tokens are strictly time-bound and do **not** get refunded if a student rejects or ignores the offer. This forces teachers to be selective with their offers and strongly incentivizes upgrading to get more tokens.

---

## 2. Subscription Tiers

### Free Plan (Default Tier)
- **Target Audience:** New teachers testing the platform.
- **Quota:** 5 Tokens (Requests) per week.
- **Limits:** Once 5 requests are sent, all "Send Offer" buttons are locked until the following Monday (or a rolling 7-day window).
- **Matchmaking:** Standard visibility in recommendations (organic placement without the +20 Pro boost).

### Pro Plan (Paid Tier - ₹299/month)
- **Target Audience:** Serious teachers scaling their tuition business.
- **Quota:** 15 Tokens (Requests) per week.
- **Perks:** 
  - 3x more bidding power.
  - Priority matchmaking algorithm (+20 points matchmaking score boost).

---

## 3. Technical Implementation Plan

To ensure the system is 100% hacker-proof, the quota limit will be strictly enforced at the database level using Firestore Security Rules, preventing malicious users from bypassing frontend limits.

### Database Schema Updates
The `tutors` collection maintains the following quota and subscription fields:
- `subscriptionPlan`: String (`'free'` or `'pro'`)
- `subscriptionExpiry`: Number (Epoch timestamp in milliseconds, enforced server-side via `verify-subscription-payment` / Razorpay webhook)
- `subscriptionUpdatedAt`: Timestamp (Firestore `serverTimestamp()`)
- `isSubscribed`: Boolean (`true` if active Pro tier)
- `bankedTokens`: Number of banked tokens accumulated via successful tutor referrals
- `weeklyQuota`: Object tracking current usage
  - `tokensUsed`: Number (Count of tokens used in the current week; limit is 5 for Free, 15 for Pro)
  - `lastReset`: Timestamp (Firestore `serverTimestamp()` recorded on Monday reset)
  - `lastUpdated`: Timestamp (Firestore `serverTimestamp()` recorded on token usage)

### Weekly Quota Rollover via Cloud Scheduler (`weeklyQuotaReset`)
- **Schedule:** Triggers every **Monday at 00:00 IST** (`0 0 * * 1`) via `functions/src/scheduled/weeklyQuotaReset.ts`.
- **Batch Processing:** Utilizes `BatchManager` capping writes at 400 operations per batch to handle thousands of tutors safely without Firestore limits.
- **Reset Logic:** Resets `weeklyQuota.tokensUsed` to `0` for all tutors. On proposal or demo request creation, available tokens are dynamically verified against the tier limit (`5` for Free, `15` for active Pro tutors where `subscriptionExpiry > Date.now()`).

### Banked Token Redemption (`redeemBankedToken`)
- **Callable Cloud Function:** `functions/src/callable/redeemToken.ts` (`onCall`, authenticated tutor).
- **Atomic Transaction:** Executes an atomic read-modify-write on `tutors/{tutorId}`:
  - Validates that `bankedTokens >= 1`.
  - Decrements `bankedTokens` by 1.
  - Increments active proposal headroom by decrementing `tokensUsed` by 1 (or granting 1 bonus token).
  - Returns updated token counts, allowing the teacher to send proposals immediately.

### Secure Payment Integration (Razorpay)
- **Order Creation (`/api/create-subscription-order`):** Generates a server-locked Razorpay order for ₹299.
- **Verification (`/api/verify-subscription-payment`):** Verifies HMAC signature, upgrades `subscriptionPlan: 'pro'`, sets `isSubscribed: true`, credits 10 tokens to `weeklyQuota.tokensUsed` (`Math.max(0, currentTokensUsed - 10)`), and calculates `subscriptionExpiry = Math.max(now, currentExpiry) + 1 calendar month` using server-side timestamps.

---

## 4. UI / UX Experience

- **The Progress Bar:** The Subscription tab will feature a clean progress bar showing `X / 5 Requests Used This Week`.
- **The Lockout:** If a Basic teacher hits 5 requests, the "Send Offer" button in the Student modal will turn gray. Clicking it will open a "Quota Exceeded" modal with a direct link to pay for the Pro plan. 
- **The Upsell:** The Pro tier card will clearly highlight the ROI: *"Upgrade for ₹299 to unlock 10 more students this week!"*
- **Brand Palette Integration:** The Pro pricing card and Active Pro hero banner feature the `#00a992` brand gradient (`from-[#00a992] to-[#008270]`) with high-contrast white CTAs, establishing a consistent brand identity across both dashboards.
