# WhatsApp Automation Options

> [!NOTE]
> **Historical Architecture Note:** This exploration document was authored prior to the deployment of Firebase Cloud Functions (2nd Gen) and Next.js App Router API endpoints. With serverless backend runtime and Cloud Scheduler now active in the platform (`functions/src`), background webhook triggers (Option A) can be wired directly to WhatsApp Business API providers (e.g., Twilio / Interakt) without requiring long-lived servers.

Since the platform initially ran entirely on the frontend (React/Next.js) and connected directly to Firebase, standard WhatsApp links (`wa.me`) required a user to manually click and open their own WhatsApp app. 

To achieve automated messaging, we have two options:

## Option A (The Professional & Fully Automatic Way)

- **Architecture:** We set up a **Firebase Cloud Function** (a small script that lives on your database server). 
- **Integration:** We connect this function to a **WhatsApp Business API** provider (like Twilio, Interakt, Wati, or Meta's official API).
- **How it works:** The moment a demo is marked as "Finished" in the database, the Cloud Function automatically triggers in the background. It uses the API to instantly send a pre-written feedback message template directly to the WhatsApp numbers of both the teacher and the student.
- **Pros:** Completely hands-free, highly professional, runs even if the user closes their browser.
- **Cons:** Requires setting up a WhatsApp Business account and API provider (which usually has a small per-message cost).

## Option B (The Free & Semi-Automatic Way)

- **Architecture:** We keep the current frontend logic without needing any backend or API providers.
- **Integration:** Standard `wa.me` URL links with pre-filled text.
- **How it works:** When the teacher clicks the "Mark Demo as Finished" button in their portal, we instantly show them a success popup with two action buttons: "Send Feedback Request to Student" and "Send Feedback Request to Admin".
- When the teacher clicks these buttons, it opens their own WhatsApp app on their device with the feedback message already typed out. They just have to hit "Send".
- **Pros:** Completely free, no API approval process, fast to implement.
- **Cons:** Requires the teacher to actively click the buttons to send the messages. Not fully "automatic" in the background.
