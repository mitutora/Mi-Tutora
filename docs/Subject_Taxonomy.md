# Subject Taxonomy — Mi Tutora

> **Single source of truth**: All subject lists below are defined in
> `web/src/utils/subjects.ts` and are used by both the Student Portal
> (`DemoForm.tsx`) and the Teacher Portal (`TeacherForm.tsx`).
> The server-side matchmaking engine (`functions/src/utils/matchingEngine.ts`)
> applies alias / wildcard tolerance when comparing these subjects.

---

## 1. Board & Grade Tier Rules

| Board | Nursery–6th tier | 7th–10th tier | 11th–12th / PU tier |
|---|---|---|---|
| **CBSE** | `CBSE_STATE_NURSERY_TO_6` | `CBSE_STATE_7_TO_10` | Stream subjects |
| **State Board** | `CBSE_STATE_NURSERY_TO_6` | `CBSE_STATE_7_TO_10` | Stream subjects |
| **IB / IGCSE** | `CBSE_STATE_NURSERY_TO_6` | `CBSE_STATE_7_TO_10` | Stream subjects |
| **ICSE** | `ICSE_NURSERY_TO_6` | `ICSE_7_TO_10` | Stream subjects |

> **Grade mapping**
> - `Nursery`, `LKG`, `UKG`, `1st`–`6th Standard` → **Early tier**
> - `7th`–`10th Standard` → **Middle / High tier**
> - `11th Standard`, `12th Standard`, `1st PU`, `2nd PU`, `Degree`, `Engineering`, `Medical` → **Senior tier**

For senior tier, a **stream filter** is presented to students:
`All` | `Science` | `Commerce` | `Arts / Humanities`

---

## 2. CBSE / State Board / IB — Nursery to Class 6

_Exported constant: `CBSE_STATE_NURSERY_TO_6` (21 subjects)_

| # | Subject |
|---|---|
| 1 | All Subject *(wildcard — see §8)* |
| 2 | English |
| 3 | Math |
| 4 | EVS |
| 5 | SST |
| 6 | Computer |
| 7 | Hindi |
| 8 | Urdu |
| 9 | Science |
| 10 | Social Science |
| 11 | Arabic |
| 12 | Gk |
| 13 | Sanskrit |
| 14 | Kannada |
| 15 | Telugu |
| 16 | Marathi |
| 17 | Tamil |
| 18 | Malayalam |
| 19 | Gujarati |
| 20 | Bengali |
| 21 | Punjabi |

---

## 3. CBSE / State Board / IB — Class 7 to 10

_Exported constant: `CBSE_STATE_7_TO_10` (27 subjects)_

| # | Subject |
|---|---|
| 1 | All Subject *(wildcard)* |
| 2 | English |
| 3 | Math |
| 4 | EVS |
| 5 | SST |
| 6 | Computer |
| 7 | Hindi |
| 8 | Urdu |
| 9 | Science |
| 10 | Social Science |
| 11 | Physics |
| 12 | Chemistry |
| 13 | Biology |
| 14 | History |
| 15 | Civics |
| 16 | Geography |
| 17 | Arabic |
| 18 | Gk |
| 19 | Sanskrit |
| 20 | Kannada |
| 21 | Telugu |
| 22 | Marathi |
| 23 | Tamil |
| 24 | Malayalam |
| 25 | Gujarati |
| 26 | Bengali |
| 27 | Punjabi |

---

## 4. ICSE — Nursery to Class 6

_Exported constant: `ICSE_NURSERY_TO_6` (22 subjects)_

| # | Subject |
|---|---|
| 1 | All Subjects *(wildcard)* |
| 2 | English |
| 3 | Mathematics |
| 4 | EVS / Environmental Studies |
| 5 | Science |
| 6 | Social Studies / Social Science |
| 7 | Computer |
| 8 | Hindi |
| 9 | Urdu |
| 10 | Arabic |
| 11 | Bengali |
| 12 | Gujarati |
| 13 | Kannada |
| 14 | Malayalam |
| 15 | Marathi |
| 16 | Tamil |
| 17 | Telugu |
| 18 | Punjabi |
| 19 | Sanskrit |
| 20 | General Knowledge (GK) |
| 21 | Art & Craft |
| 22 | Moral Science / Value Education |

---

## 5. ICSE — Class 7 to 10

_Exported constant: `ICSE_7_TO_10` (28 subjects)_

| # | Subject |
|---|---|
| 1 | All Subjects *(wildcard)* |
| 2 | English |
| 3 | Mathematics |
| 4 | Physics |
| 5 | Chemistry |
| 6 | Biology |
| 7 | Science |
| 8 | History |
| 9 | Civics |
| 10 | Geography |
| 11 | Social Studies |
| 12 | Computer |
| 13 | Hindi |
| 14 | Urdu |
| 15 | Arabic |
| 16 | Sanskrit |
| 17 | Kannada |
| 18 | Telugu |
| 19 | Marathi |
| 20 | Tamil |
| 21 | Malayalam |
| 22 | Gujarati |
| 23 | Bengali |
| 24 | Punjabi |
| 25 | General Knowledge (GK) |
| 26 | Environmental Science (EVS) |
| 27 | Art & Craft |
| 28 | Moral Science |

---

## 6. Senior Secondary (11th / 12th / PU) — Streams

Stream subjects are common across CBSE, ICSE/ISC, and State Board.

### 6.1 Science Stream

_Exported constant: `STREAM_SCIENCE` (11 subjects)_

| # | Subject |
|---|---|
| 1 | English Core |
| 2 | Physics |
| 3 | Chemistry |
| 4 | Mathematics |
| 5 | Biology |
| 6 | Computer Science / Informatics Practices |
| 7 | Physical Education / Psychology |
| 8 | Economics |
| 9 | JEE |
| 10 | NEET |
| 11 | KCET |

### 6.2 Commerce Stream

_Exported constant: `STREAM_COMMERCE` (11 subjects)_

| # | Subject |
|---|---|
| 1 | Accountancy |
| 2 | Business Studies |
| 3 | Economics |
| 4 | English Core |
| 5 | Mathematics |
| 6 | Applied Mathematics |
| 7 | Entrepreneurship |
| 8 | Informatics Practices |
| 9 | Computer Science |
| 10 | Physical Education |
| 11 | Psychology |

### 6.3 Arts / Humanities Stream

_Exported constant: `STREAM_ARTS` (15 subjects)_

| # | Subject |
|---|---|
| 1 | English Core |
| 2 | Hindi Core |
| 3 | History |
| 4 | Political Science |
| 5 | Geography |
| 6 | Economics |
| 7 | Sociology |
| 8 | Psychology |
| 9 | Legal Studies |
| 10 | Fine Arts / Painting |
| 11 | Physical Education |
| 12 | Home Science |
| 13 | Informatics Practices |
| 14 | Entrepreneurship |
| 15 | Mass Media Studies |

---

## 7. Teacher Subject Selection Rules

Teachers select **classes** (grade ranges) and **boards**; the subject list is
automatically derived as the **union** of all applicable subject sets.

| Teacher's Class Range | Maps to Grade Tier |
|---|---|
| `LKG`, `UKG`, `1st - 5th` | Early |
| `6th - 8th`, `9th - 10th` | Middle / High |
| `1st PU`, `2nd PU` | Senior |

**Union logic (implemented in `getSubjectsForTeacher`):**
- If teacher selects ICSE → ICSE subject set is included.
- If teacher selects CBSE / State Board / IB → CBSE/State subject set is included.
- If both are selected → union of both sets.
- Senior tier always adds all three stream sets (Science + Commerce + Arts).

---

## 8. Matchmaking Engine — Alias & Wildcard Rules

The matchmaking engine (`matching.ts` on client, `matchingEngine.ts` on server)
uses `matchesSubjectToken()` to compare student needs against teacher offers.
Matching is **case-insensitive**, ignores spaces and punctuation, and applies
the following rules before comparing:

### 8.1 Wildcard

| Offer-side token | Matches |
|---|---|
| `All Subject` | Any subject |
| `All Subjects` | Any subject |

### 8.2 Slash Splitting

Compound subjects that use `/` are split and matched against either part:

| Stored value | Splits into |
|---|---|
| `Computer Science / Informatics Practices` | `Computer Science` OR `Informatics Practices` |
| `Physical Education / Psychology` | `Physical Education` OR `Psychology` |
| `EVS / Environmental Studies` | `EVS` OR `Environmental Studies` |
| `Social Studies / Social Science` | `Social Studies` OR `Social Science` |
| `Fine Arts / Painting` | `Fine Arts` OR `Painting` |

### 8.3 Subject Aliases

Aliases are bidirectional — either side can be student or teacher.

| Canonical group | Aliases (normalized, no spaces/punctuation) |
|---|---|
| **Math** | `math`, `mathematics` |
| **Social Studies / SST** | `sst`, `socialscience`, `socialstudies` |
| **EVS** | `evs`, `environmentalstudies`, `environmentalscience` |
| **GK** | `gk`, `generalknowledge` |
| **Art & Craft** | `art`, `artcraft`, `finearts`, `painting` |
| **Moral Science** | `moralscience`, `valueeducation` |
| **English** | `english`, `englishcore` |
| **Hindi** | `hindi`, `hindicore` |

### 8.4 False Positive Prevention

`science` does **NOT** match `social science` — the engine checks full normalized
tokens before alias expansion.

---

## 9. Firestore Storage Format

Subjects are stored as plain `string[]` in Firestore — no special schema.

| Collection | Document type | Field |
|---|---|---|
| `students` | Student profile | `subjects: string[]` |
| `tutors` | Teacher profile | `subjects: string[]` |
| `tuition_requests` | Demo / request | `combinedSubjects: string[]` |

> **Data migration**: If old subject data exists, it should be cleared and
> re-entered — no legacy compatibility layer is maintained. The matchmaking
> engine's alias tolerance handles minor naming differences from fresh data entry.
