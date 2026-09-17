# Admin User Management Architecture & Operations Guide

This document explains how administrator privileges are managed in MiTutora, how authentication and authorization work for admin accounts, and step-by-step instructions on how to **add** and **remove** admin users.

---

## 1. Overview of Admin Role Architecture

MiTutora uses a **dual-tier verification system** for platform administrators:

1. **Firebase Auth Custom Claims**:
   - `admin: true`
   - `role: "admin"`
   - Evaluated instantly on client sign-in via `user.getIdTokenResult(true)`.

2. **Firestore Database (`users/{uid}`)**:
   - Document ID: Firebase Authentication User UID (`user.uid`).
   - Fields:
     - `role: "admin"`
     - `roles: ["admin", ...]` (array of assigned roles)
     - `email: "user@example.com"`

3. **Firestore Security Rules Enforcement ([`firestore.rules`](../firestore.rules))**:
   - The `isAdmin()` rule checks both the auth token custom claims and the `users/{request.auth.uid}` document.
   - When verified, administrators are granted unrestricted read/write access across all collections (`match /{document=**} { allow read, write: if isAdmin(); }`).

---

## 2. Multi-Admin Support

**MiTutora supports multiple administrators.** There is no hard limit on the number of admin accounts. Each staff member or administrator logs in using their own unique Google account.

---

## 3. How to Add a New Admin User

There are two methods to add a new admin:

### Method A: Via CLI Terminal Script (Recommended — Fastest)

A management script is provided at [`db_analyzer/set-admin.js`](../db_analyzer/set-admin.js). It sets both Firestore document roles and Firebase Auth Custom Claims in one step.

#### Step 1: Ensure the user has registered or signed in at least once
The user must have created an account or clicked "Sign in with Google" on the platform at least once so their Firebase Auth record exists.

#### Step 2: Run the command in your terminal
```powershell
node db_analyzer/set-admin.js add <user-email>
```

**Example:**
```powershell
node db_analyzer/set-admin.js add nikhil.4002.50.82@gmail.com
```

**Output:**
```
Successfully granted ADMIN privileges to nikhil.4002.50.82@gmail.com (UID: VdKODc0GUYNP8buWXDY4YodSWMh1)
```

---

### Method B: Via Firebase Console UI (Manual)

If you prefer doing it manually in the web browser without using the terminal:

#### Step 1: Obtain the User UID
1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **`tutor-app-1e394`**.
3. In the left sidebar, navigate to **Authentication** $\rightarrow$ **Users**.
4. Search for the user's email address.
5. Copy the **User UID** column (e.g. `VdKODc0GUYNP8buWXDY4YodSWMh1`).

#### Step 2: Update Firestore Document
1. In the left sidebar, click **Firestore Database** $\rightarrow$ **Data** tab.
2. Select the **`users`** collection.
3. Locate or create the document with the **User UID** as the Document ID:
   - **If the document already exists:**
     - Click **Add field**:
       - Field name: `role`
       - Type: `string`
       - Value: `admin`
     - If `roles` exists as an array:
       - Click the `+` icon inside `roles` array and add `"admin"`.
   - **If the document does not exist:**
     - Click **+ Add document**.
     - Document ID: Paste the **User UID**.
     - Add fields:
       - `email` (string): `user@example.com`
       - `role` (string): `admin`
       - `roles` (array): `["admin"]`
4. Click **Save**.

---

## 4. How to Remove an Admin User

### Method A: Via CLI Terminal Script (Recommended)

Run the remove command in the terminal:

```powershell
node db_analyzer/set-admin.js remove <user-email>
```

**Example:**
```powershell
node db_analyzer/set-admin.js remove staff@example.com
```

**Output:**
```
Successfully removed ADMIN privileges from staff@example.com (UID: ...)
```

The script will:
1. Revoke the Firebase Auth custom claim (`admin: false`).
2. Remove `"admin"` from the user's `roles` array in Firestore.
3. Revert `role` to their primary user role (e.g. `"student"` or `"teacher"`).

---

### Method B: Via Firebase Console UI (Manual)

1. Open [Firebase Console](https://console.firebase.google.com/) $\rightarrow$ **Firestore Database**.
2. Select the **`users`** collection.
3. Open the user's document (`users/{uid}`).
4. Change the `role` field from `admin` to `student` (or delete the field).
5. In the `roles` array, click the delete icon next to `"admin"`.
6. Save the document.
7. Next time the user attempts to sign in to `/login` on the Admin Portal, access will be rejected with:
   `Access Denied: Account <email> is not registered as an administrator.`

---

## 5. Verifying Admin Status

### From Client Applications:
- **Admin App ([`admin/src/context/AdminAuthContext.tsx`](../admin/src/context/AdminAuthContext.tsx))**:
  Automatically queries `getIdTokenResult()` and `users/{uid}` on every auth state change.
- **Admin Login ([`admin/src/app/login/page.tsx`](../admin/src/app/login/page.tsx))**:
  Verifies admin rights immediately upon Google popup completion before navigating to `/`.

### Firestore Rules Check:
```javascript
function isAdmin() {
  return request.auth != null && (
    request.auth.token.get('admin', false) == true ||
    request.auth.token.get('role', '') == 'admin' ||
    (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
     (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', '') == 'admin' ||
      ('roles' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data &&
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['admin']))))
  );
}
```
