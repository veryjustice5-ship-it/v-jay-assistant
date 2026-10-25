# Personal AI Messaging Assistant (Prototype)

A privacy-first AI messaging assistant prototype designed to manage incoming SMS and personal WhatsApp messages on Android with modular classification, safety enforcement, human-in-the-loop review, and restricted automation.

---

## 1. Quick Start & Test Execution

Run the complete 21-test automated suite:
```bash
python3 ai-messaging-assistant/run_tests.py
```

To run with Flask:
```bash
cd ai-messaging-assistant
pip install -r requirements.txt
python3 app.py
```
Open `http://localhost:5000` to interact with the dashboard.

---

## 2. Architecture & Pipeline Sequence

The message processing engine enforces an 8-stage sequence:
```
Incoming Message 
  → 1. Input Validation (Sanitize, bounds check, deduplication)
  → 2. Message Classification (11 distinct categories, regex & LLM interface)
  → 3. Context Retrieval (Conversation history, contact allowlist check)
  → 4. Reply Generation (Style matching, anti-hallucination, clarification requests)
  → 5. Safety & Invariant Checks (Prompt injection containment, OTP/passcode defense)
  → 6. Automation Decision (Mode A: Draft, Mode B: Approval, Mode C: Restricted Auto)
  → 7. Sending Integration (Simulated SMS / WhatsApp channel adapters)
  → 8. Audit Logging (Non-sensitive telemetry & decision trail)
```

---

## 3. Automation Modes

- **Mode A: Draft Only**: All generated replies are stored as drafts. Nothing is sent automatically.
- **Mode B: Approval Required**: Replies are prepared and queued for explicit user approval, edit, or rejection.
- **Mode C: Restricted Automatic Replies**: Automatically replies ONLY if all 7 invariants are met:
  1. Master automation is enabled.
  2. Global emergency stop is inactive.
  3. Sender is an explicitly authorized contact.
  4. Message category is in the permitted allowlist.
  5. Reply does not require personal knowledge, commitments, or calendar confirmation.
  6. Safety checks pass (no prompt injection, no credential/OTP request).
  7. Rate limits (global and contact-specific) are not exceeded.

---

## 4. Android SMS & Personal WhatsApp Technical Feasibility

### SMS Integration:
- **Permissions**: `android.permission.RECEIVE_SMS`, `android.permission.READ_SMS`, `android.permission.SEND_SMS`.
- **Default SMS App Requirement**: On Android 10+, background SMS sending without user intervention typically requires the app to hold the `RoleManager.ROLE_SMS` (Default SMS App role). Otherwise, sending requires explicit foreground interaction or carrier-level APIs.

### Personal WhatsApp Integration:
- **Official WhatsApp Business Platform (Cloud API)**:
  - *Limitation*: Cannot access chats inside the personal consumer WhatsApp app. Requires migrating the phone number away to a Meta Cloud account.
- **Android `NotificationListenerService` + `RemoteInput` (Recommended Path)**:
  - Listens for `com.whatsapp` notifications.
  - Extracts message previews and sender titles.
  - Dispatches replies by invoking the Wearable/Quick-Reply `RemoteInput` action on the notification.
  - *Limitations*: Cannot read past chat history from the phone's encrypted SQLite database, cannot detect messages when chat is open or muted, and cannot access attachments.
- **AccessibilityService**:
  - *Risk*: Brittle to WhatsApp UI changes, violates Google Play Developer Policy, and introduces critical security hazards.
- **Web Reverse Engineering (e.g., Baileys/puppeteer)**:
  - *Risk*: Violates WhatsApp Terms of Service; accounts are frequently banned.
