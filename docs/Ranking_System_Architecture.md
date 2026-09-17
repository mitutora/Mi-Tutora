# Ranking & Matchmaking Architecture

Welcome! This document explains exactly how the platform matches Students with Teachers. We've designed this guide to be so simple that anyone can understand it, while also providing the exact technical database fields for developers.

---

## The Big Picture: How It Works

The platform uses a **Profile-Gated Discovery Engine** to show the most relevant profiles to students and teachers based on their onboarding state:

1. **Before Initial Profile Setup (The Open Market — "All"):** When a user has not yet configured their subjects, category, or student profile (`!hasProfile`), they explore the full market in the "All" section. Profiles are scored based on base suitability, and users are presented with an informational reminder prompt to complete their profile to unlock tailored recommendations. The manual toggle pill is hidden.
2. **After Initial Profile Setup (The VIP Lounge — "Recommended"):** Once a profile is established (`hasProfile`), the "New Tuition" discovery feed transitions exclusively to the "Recommended" section. Before a candidate profile can enter this section, it must pass a strict security check (the `isStrictMatch` filter). If they fail even one critical requirement (like teaching the wrong grade or board), they are filtered out entirely. The "All" section and toggle pill are removed from this view.

---

## 1. The Strict Filter (Who gets into "Recommended"?)

Before the system does any heavy math, it runs a fast Yes/No check called the **Strict Filter**. 

If a profile fails **any** of the following rules, they are instantly rejected from the Recommended tab:

| Rule | Explanation | Database Fields Used |
| :--- | :--- | :--- |
| **1. Category** | A Programming student will *never* see a School teacher. | `category` (Student & Teacher) |
| **2. Board** | If the student is CBSE, the teacher *must* teach CBSE. | `board` (Student) <-> `boards` (Teacher) |
| **3. Class** | If the student is 10th grade, the teacher *must* teach 10th grade. | `classLevel` (Student) <-> `classes` (Teacher) |
| **4. Gender Pref** | If a student requests a "Female" teacher, male teachers are blocked. | `teacherGenderPreference` (Group/Tuition Request) <-> `gender` (Teacher) |
| **5. Subjects** | The teacher *must* offer **100%** of the subjects the student asked for. | `subjects` (Student) <-> `subjects` (Teacher) |
| **6. Delivery Mode** | An Online teacher will *never* see an Offline student (and vice versa). | `mode` / `preferredMode` (Student & Teacher) |

> **Developer Note:** This check is powered by the `isStrictMatch()` function in `matching.ts` and Cloud Functions `matchingEngine.ts`. To save battery and CPU on mobile phones, we run this fast filter *before* calculating scores!

---

## 2. The Point System (How do we calculate the Score?)

If a profile passes the strict filter (or if the user is looking at the "All" tab), the system calculates their **Suitability Score**. 

Points are awarded based on how well the Teacher and Student match:

- **+20 Points** for matching the Board.
- **+30 Points** for matching the Class/Grade.
- **+50 Points** for **EVERY** subject they have in common. (e.g., matching Math and Science = 100 points!)
- **+0 to +30 Points** based on Budget. If the student's budget exactly matches the teacher's fee, they get 30 points. As the price gap widens, the points decrease.

### Offline Proximity Scoring (Haversine Formula)
For offline home tuition inquiries, physical distance matters significantly to both parents and tutors. When offline tuition is requested (`mode: 'offline'`), the platform calculates the great-circle geographic distance using the Haversine formula between the student's group location and the tutor's registered coordinates:
- **$\le 3$ km:** **+30 Points** (Neighborhood tier — minimal commute)
- **$3.1$ to $6$ km:** **+20 Points** (Local tier — comfortable commute)
- **$6.1$ to $10$ km:** **+10 Points** (Extended city radius)
- **$> 10$ km:** **+0 Points** (Beyond reasonable local radius)

> [!NOTE]
> **Pure Online Isolation:** If pure `'online'` tuition is requested, the proximity engine is completely bypassed (`+0` points), ensuring online recommendations remain 100% focused on academic fit regardless of geographic distance. Profiles with missing coordinates or zeroed values (`0.0`) safely default to `+0` points without penalty.

### Google Maps Location View (Strictly Offline Tuitions)
For offline tuitions, parents and educators need to quickly assess physical transit feasibility before requesting a demo or making an offer:
- **Button Placement (Option B):** Positioned directly above the action buttons (`[ View ]` and `[ Request Demo / Make Offer ]`) on cards in the **New Tuition** tab.
- **Strictly Offline Gate:** Evaluates `mode?.toLowerCase().trim() === 'offline'`. Excluded entirely from `'Online'` tuitions.
- **Zero API Cost Universal Query Link:** Opens directly in Google Maps in a new browser tab (`_blank`, `noopener,noreferrer`):
  - With GPS coordinates: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  - Text fallback: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${area}, ${city}`)}`
- **Clean Icon Styling:** Utilizes Lucide React icons (`MapPin` and `ExternalLink`) with zero emojis.

### Trust & Premium Bonuses
To reward our most trusted and active teachers without breaking the organic matchmaking system:
- **+20 Points** for having an active **Pro Subscription**.
- **+20 Points** for having a verified **Aadhar ID** (Trust & Safety).

*Example:* A Pro Subscription (+20) gives a helpful nudge, but a free teacher who perfectly matches multiple subjects (+100) will still outrank a Pro teacher who only matches one subject (+50). This keeps the platform fair and academically focused!

---

## 3. The Sorting Order (Who is #1?)

Once everyone has a score, the UI sorts the cards from top to bottom. The priority is:

1. **Active Conversations (VIPs):** Anyone you are actively negotiating with gets an invisible **+1000 points** to force them to the absolute top of your screen. (Declined people get -1000 points).
2. **Highest Score:** The highest Suitability Score comes next.
3. **Budget Tie-Breaker:** If two teachers both have a score of 80, the one whose fee is closest to the student's budget wins the tie.

---

## The Data Flow (Mermaid Diagram)

Here is a visual map of how data is scored server-side and delivered in 20-card paginated slices:

```mermaid
graph TD
    %% Database Collections
    DB_T[Tutors Collection]
    DB_S[Students Collection]
    DB_G[Groups Collection]
    
    %% Server-Side Engine
    subgraph ServerSide [Server-Side Ranking Engine (Cloud Functions / Next.js API)]
        FETCH[Fetch All Candidate Profiles]
        STITCH[Stitch Group Preferences into Student Data]
        FILTER{Passes isStrictMatch?}
        SCORE[Calculate Suitability Score]
        GLOBAL_SORT[Global Sort by Score Descending (Rank #1 Guaranteed)]
        PAGINATE[Slice by page & pageSize=20]
    end
    
    %% Frontend Client
    subgraph Frontend [Client Browser / React UI]
        GATE{Profile Setup Complete?}
        VIEW_ALL[All View: Open Market Feed]
        VIEW_REC[Recommended View: Curated Matches]
        STATE[Append 20 Cards to Feed]
        LOAD_MORE[User Clicks 'Load More' Button]
    end
    
    %% Flow
    DB_T --> FETCH
    DB_S --> FETCH
    DB_G --> STITCH
    
    FETCH --> STITCH
    STITCH --> FILTER
    FILTER -- Yes --> SCORE
    FILTER -- No --> SCORE_ZERO[Score = 0]
    
    SCORE --> GLOBAL_SORT
    SCORE_ZERO --> GLOBAL_SORT
    GLOBAL_SORT --> PAGINATE
    
    PAGINATE -->|20 Cards per Page| STATE
    STATE --> GATE
    GATE -- No (!hasProfile) --> VIEW_ALL
    GATE -- Yes (hasProfile) --> VIEW_REC
    LOAD_MORE -->|Fetch page + 1| PAGINATE

    classDef database fill:#f9dbbd,stroke:#d98324,stroke-width:2px,color:#000;
    classDef server fill:#b5eaea,stroke:#2b9eb3,stroke-width:2px,color:#000;
    classDef react fill:#cceabb,stroke:#3f8832,stroke-width:2px,color:#000;
    classDef gate fill:#fcdab7,stroke:#c45b14,stroke-width:2px,color:#000;
    
    class DB_T,DB_S,DB_G database;
    class FETCH,STITCH,FILTER,SCORE,SCORE_ZERO,GLOBAL_SORT,PAGINATE server;
    class STATE,LOAD_MORE,VIEW_ALL,VIEW_REC react;
    class GATE gate;
```

---

## 4. Server-Side Execution & 20-Card Lazy Loading

To eliminate mobile browser lag and protect proprietary matchmaking formulas, 100% of candidate filtering, score calculation, and sorting occurs **server-side** (via 2nd Gen Firebase Cloud Functions `getRankedTutors` / `getRankedStudents` invoked via `dashboardApi.ts` using `httpsCallable`):

1. **Global Rank #1 Guarantee:** 
   The server-side engine queries all candidate profiles, runs `isStrictMatch` and score calculations across every profile, and sorts the complete array in descending order of score. This guarantees that Rank #1 is always the highest-matching candidate globally.
2. **20-Card Paginated Delivery:**
   The server slices the globally sorted results into chunks of 20 (`page`, `pageSize: 20`, `total`, `hasMore`).
3. **Frontend Lazy Loading:**
   The client receives the initial 20 cards (`page: 1`). When the user scrolls down or clicks **"Load More"**, the client requests `page: 2` and appends the next 20 items to state without re-rendering or re-evaluating the entire market.

---

## Developer Architecture Notes (Portal Pipelines)

### Teacher Portal Pipeline (`getRankedStudents` Callable)
- The server engine fetches **Students** and their associated **Groups**.
- **The Stitching Magic:** Because `teacherGenderPreference` lives in the `groups` collection, the backend engine stitches the parent group preferences into the student payload (`requestDoc`).
- The backend evaluates `isStrictMatch(studentGroup, activeTeacher)` and scores candidates against the authenticated teacher's qualifications, boards, and budget.
- Returns 20 students per page with `hasMore` indicator.

### Student Portal Pipeline (`getRankedTutors` Callable)
- The server engine receives the student's active group context (`studentId`, `groupDocId`, `category`, `subjects`, `board`, `classLevel`, `budget`, `genderPreference`).
- The engine fetches candidate **Tutors**, evaluates `isStrictMatch(context, tutor)`, and calculates suitability scores including verification bonuses (+20 KYC, +20 Pro).
- Sorts globally and returns the top 20 tutors for the active page.

