# Demo Completion & Hiring Architecture

This document outlines the architectural logic for what happens after a demo class is scheduled, covering the explicit confirmation of the demo by the teacher and the final hiring decision by the student.

---

## 1. The Big Picture: Transitioning from Demo to Tuition

To maintain strict state integrity and avoid assumptions based purely on the clock, the system relies on explicit user actions. The flow guarantees that a student only receives the prompt to "Hire" or "Reject" a teacher *after* the teacher confirms the demo has actually taken place.

---

## 2. The Hiring Loop & State Machine

Once the negotiation phase successfully ends with the `demo_scheduled` state, the following workflow activates:

### A. Teacher Confirmation & Start-Time Lock
The application remains in `demo_scheduled` until the teacher explicitly logs into their dashboard and clicks the **"Mark Demo as Finished"** button. 

To prevent tutors from prematurely or accidentally marking a demo as completed before it actually occurs, this button is protected by a **Start-Time Lock**:
- **Before Demo Start Time (`trustedNow < demoStartTime`):** The button is **disabled and grayed out** with a lock indicator: `<Lock /> Available once demo starts`.
- **At/After Demo Start Time (`trustedNow >= demoStartTime`):** A real-time 10-second ticker automatically transitions the button into its active clickable state (`Mark Demo as Finished`) without requiring a page refresh.
- **Server-Trusted Time:** The lock is evaluated against `trustedNow` (backed by Firestore server timestamps), protecting against client clock tampering.

### B. State Transition
Clicking this button fires the `demo_finished` transaction action:
- The status immediately transitions from `demo_scheduled` to `waiting_for_parent_decision`.
- The `updatedAt` timestamp is recorded to mark the exact second the demo was logged as finished by the teacher.

### C. Student Decision
Once the status is `waiting_for_parent_decision`, the student's dashboard updates to present the final decision UI, unlocking the "Hire" and "Reject" buttons.
- **Hire:** The status advances to `tuition_started`.
- **Reject:** The status becomes `declined`.

### D. The 48-Hour Auto-Decline Timeout (`expireDemosAndDecisions`)
To ensure that teachers are not left waiting indefinitely for a response, the system enforces a strict 48-hour timeout on the student's decision via a dedicated **Cloud Scheduler Cron Runner**:
- The 48-hour clock begins ticking from the `updatedAt` timestamp (the moment the teacher clicked "Mark Demo as Finished").
- **Hourly Serverless Cron (`expireDemosAndDecisions`):** Running hourly (`0 * * * *`, IST), this 2nd Gen Cloud Function checks all documents in `waiting_for_parent_decision`.
- If 48 hours have passed and the student still hasn't made a decision, the function automatically transitions the status to `declined`, freeing up the teacher's schedule and resetting active queue counts.
- In addition, if a teacher neglects to mark a conducted demo as finished, the job automatically transitions sessions older than 24 hours past the scheduled time to `waiting_for_parent_decision` (stamping `demoCompletedAt: serverTimestamp()`), unlocking the 48-hour parent hiring decision window.

---

## 3. Example Flow

1.  **Scheduling Complete:** The student and teacher agree on a time, and the status becomes `demo_scheduled` for Tuesday at 5:00 PM.
2.  **Demo Execution (Teacher):** The demo finishes on Tuesday at 6:00 PM. The teacher clicks "Mark Demo as Finished" (or if neglected, the system auto-transitions it 24h later). The status becomes `waiting_for_parent_decision`.
3.  **Timeout Initiation:** The 48-hour timeout clock starts ticking on Tuesday at 6:00 PM (or upon auto-transition).
4.  **Hourly Automated Auto-Decline (Cloud Scheduler):** The student takes no action for 2 days. On Thursday at 6:01 PM, the `expireDemosAndDecisions` cron detects that 48 hours have elapsed and automatically marks the status as `declined`.

---

## 4. State Machine Diagram

The following diagram maps the transition of the application status during this final phase.

```mermaid
stateDiagram-v2
    [*] --> demo_scheduled
    
    state "Decision Phase" as DecisionPhase {
        direction LR
        demo_scheduled --> waiting_for_parent_decision : demo_finished (Teacher Action)
        demo_scheduled --> waiting_for_parent_decision : 24h Unconfirmed (System Cron)
    }
    
    waiting_for_parent_decision --> tuition_started : Hire (Student Action)
    waiting_for_parent_decision --> declined : Reject (Student Action)
    waiting_for_parent_decision --> declined : 48h Timeout (System)
    
    demo_scheduled --> declined : decline (Manual)
    
    declined --> [*]
    tuition_started --> [*]
```
