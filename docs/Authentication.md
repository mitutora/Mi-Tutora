# MiTutora Authentication Architecture

## 1. Core Provider
MiTutora uses **Firebase Authentication** as its primary identity provider, supporting both traditional **Email/Password** and **Google OAuth**.

## 2. The Multi-Role System (Unified Identity)
Unlike many platforms where a user must create separate accounts with different emails to be both a teacher and a student, MiTutora uses a **Unified Multi-Role Identity System**.
- A user signs up with a single email address.
- The active role for their current session is determined by the URL parameter (e.g., `?role=teacher` vs `?role=student`).
- If a student decides they also want to teach, they simply log into the Teacher portal with their existing student email. The system detects this, automatically appends `'teacher'` to their `roles` array in the database, and provisions a Teacher profile for them without forcing a re-signup.

## 3. Database Topology
When a new user successfully authenticates, their data is split across specialized collections:
1. **`users` (Central Hub):** Stores the universal identity (`uid`, `email`, `roles: ['student', 'teacher']`, and referral tracking).
2. **`parents` / `tutors` (Specialized Nodes):** Depending on the role they signed up for, a specialized document is created to track role-specific data (like quotas, teacher categories, or student profiles). These are given human-readable IDs (e.g., `MTPxxxx` for parents, `MTTxxxx` for teachers).

## 4. Email & Password Flow
1. User enters Email and Password on `signup/page.tsx`.
2. `createUserWithEmailAndPassword` is called.
3. The system executes database writes. **(Safety Mechanism: If the database write fails, the system automatically deletes the newly created Firebase Auth user to prevent "ghost accounts").**
4. The system dispatches an **Email Verification** link via `sendEmailVerification(user)`.
5. **Interactive Verification & Spam Notice Modal:** Instead of an abrupt auto-redirect, an interactive modal popup appears:
   - Displays the registered recipient email address.
   - Highlights a prominent **Spam / Junk Alert** notifying the user that automated verification emails often land in Spam, Junk, or Promotions, and instructs them to mark the email as "Report Not Spam" to ensure future lesson links arrive safely.
   - Features a **"Proceed to Login"** button that redirects the user to `/login?role=${role}` after clean session sign-out.
6. The user cannot access the dashboard until they click the verification link. Attempting to log in with an unverified account triggers a toast reminder advising them to check their Spam/Junk folder if not found in their primary inbox.

## 5. Google OAuth Flow (The "Post-Auth Intercept")
The Google flow is highly optimized and unified across both the `login` and `signup` pages to prevent user error.
1. User clicks "Continue with Google".
2. Google authenticates them instantly.
3. The system checks the `users` collection to see if their `uid` already exists.
   - **If they exist:** The system silently logs them in (and updates their `roles` array if they are accessing a new portal).
   - **If they are new:** The system pauses the signup, triggers a **Referral Modal**, captures their referral code (or skips), writes the referral logic to the database, and then provisions their account.

## 6. Session Persistence & Protection
- **Local Cache:** The active session and current role are temporarily stored in `localStorage` (`user`) so the frontend can route them instantly without waiting for network calls.
- **True Authentication:** Access to the actual dashboard data (`dashboardApi.ts`) is strictly gated by `auth.onAuthStateChanged`. If a user manually edits their `localStorage` to spoof an identity, the backend queries will fail because Firebase rules enforce true authentication tokens.

## 7. Cloud Auth Trigger (`onUserCreated`)
*   **File:** `functions/src/triggers/onUserCreated.ts`
*   **Trigger:** `auth.user().onCreate` (Firebase Auth 2nd Gen)
*   **Responsibility:** When any user registers via email or Google OAuth, this serverless trigger initializes backend tracking documents, parses `referredBy` tags, guards against self-referral attempts, and creates the pending referral ticket in Firestore.

## 8. Secure Account Deletion (`deleteUserAccount`)
*   **File:** `functions/src/callable/deleteAccount.ts`
*   **Trigger:** `onCall` (Authenticated User)
*   **Active Tuition Lock:** Before permitting deletion, the function checks all associated `applications`. If the user is currently engaged in an active tuition (`status === 'tuition_started'`), account deletion is strictly rejected (`FAILED_PRECONDITION`) to protect ongoing teaching commitments and escrow funds.
*   **Safe Anonymization:** If eligible, user documents are sanitized and the Firebase Auth account is permanently deleted.
