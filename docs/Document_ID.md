# MiTutora ID Architecture Guide

This document defines the strict rules and naming conventions for all ID fields across the MiTutora database to ensure clean separation between backend relationships and frontend display tags.

## Core Rules

1. **Backend Relational IDs (`*DocId`)**
   - **What they are:** These are the true, auto-generated 20-character strings created by Firebase Firestore (e.g., `KM5d3Dfphmetm1GiApxDJeR2NP72`, `Ra0cVSCGj6smOEAP7CMg`).
   - **Usage:** Whenever a document needs to point to another document (a Foreign Key), it MUST use the `*DocId` naming convention and store the raw Firebase string.
   - **Examples:** `parentDocId`, `tutorDocId`, `groupDocId`, `studentDocIds`.
   - **Rule of Thumb:** If it powers the backend logic or relationships, it uses `*DocId`.

2. **Frontend Cosmetic IDs (`*Id`)**
   - **What they are:** These are custom, human-readable 9-character strings generated via `idGenerator.ts` using specific prefixes (e.g., `MTAXXXXXX`, `MTSXXXXXX`, `MTGXXXXXX`).
   - **Usage:** These are purely for tracking and display purposes in the UI (User/Admin dashboards). They are saved directly inside their respective documents under a clean `*Id` field name.
   - **Examples:** `applicationId`, `studentId`, `groupId`, `parentId`, `tutorId`.
   - **Rule of Thumb:** If it is meant to be read by humans or tracked visually, it uses `*Id`.

---

## Examples by Collection

### 1. `parents` Collection
When a parent is created, they are assigned a cosmetic `parentId`, while storing their native `parentDocId` for referencing themselves if needed.

```json
{
  "parentId": "MTP84JF92",          // Cosmetic ID (Frontend)
  "parentDocId": "KM5d3Dfphmet...", // Relational ID (Firebase Native)
  "authUid": "KM5d3Dfphmet...",
  "name": "John Doe"
}
```

### 2. `students` Collection
A student receives a cosmetic `studentId`, while pointing to their parent and group using standard `*DocId` foreign keys.

```json
{
  "studentId": "MTS9K2P1X",         // Cosmetic ID (Frontend)
  "id": "zG75TxRvro...",            // Native Document ID
  "parentDocId": "KM5d3Dfp...",     // Foreign Key
  "groupDocId": "Ra0cVSCG...",      // Foreign Key
  "name": "Jane Doe"
}
```

### 3. `groups` Collection
A group receives a cosmetic `groupId`. It points to the parent and holds an array of student references using `*DocId`s.

```json
{
  "groupId": "MTG4B8N2Q",           // Cosmetic ID (Frontend)
  "groupDocId": "Ra0cVSCGj6...",    // Native Document ID
  "parentDocId": "KM5d3Dfp...",     // Foreign Key
  "studentDocIds": ["zG75TxRv..."], // Foreign Keys (Array)
  "status": "active"
}
```

### 4. `applications` Collection
An application receives an `applicationId`. All entities involved are strictly mapped using their native `*DocId` references.

```json
{
  "applicationId": "MTA7HF83L",     // Cosmetic ID (Frontend)
  "tutorDocId": "45qBwQ8ctH...",    // Foreign Key
  "parentDocId": "KM5d3Dfp...",     // Foreign Key
  "groupDocId": "Ra0cVSCG...",      // Foreign Key
  "studentDocIds": ["zG75TxRv..."], // Foreign Keys (Array)
  "status": "demo_requested_by_student"
}
```

---

## Generation Logic
The custom UI identifiers are generated using the `generateCustomId(prefix)` utility found in `src/utils/idGenerator.ts`. 

The function uses 36 characters (A-Z, 0-9) to randomly pull 6 characters and append them to the prefix. This yields **over 2.1 billion combinations** per prefix, which is highly robust for frontend cosmetic tracking while the backend safely relies on collision-free Firebase native strings.
