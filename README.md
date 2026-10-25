# Personal AI Messaging Assistant (v jay)

A privacy-first personal AI messaging assistant for Android SMS and WhatsApp featuring modular classification, server-side Gemini AI drafting, multi-mode automation safeguards, human-in-the-loop review, and an authenticated Android companion bridge.

---

## 1. Architecture & Pipeline Sequence

The message processing engine enforces an 8-stage sequence:
```
Incoming Message (Android SMS / WhatsApp)
  → 1. Input Validation (Sanitize, bounds check, deduplication)
  → 2. Message Classification (11 distinct categories, regex & LLM interface)
  → 3. Context Retrieval (Conversation history, contact allowlist check)
  → 4. Server-Side AI Reply Drafting (Gemini 3.8 Flash, style matching, anti-hallucination)
  → 5. Safety & Invariant Checks (Prompt injection containment, OTP/passcode defense)
  → 6. Automation Decision (Mode A: Draft, Mode B: Approval, Mode C: Restricted Auto)
  → 7. Sending & Device Confirmation (Outbound dispatch queue, Companion RemoteInput/SMS ACK)
  → 8. Audit Logging (Non-sensitive telemetry & decision trail)
```

---

## 2. Automation Modes

- **Mode A: Draft Only**: All generated replies are stored as drafts. Nothing is dispatched automatically.
- **Mode B: Approval Required**: Replies are prepared with AI reasoning and queued for explicit user approval, editing, or rejection.
- **Mode C: Restricted Automatic Replies**: Automatically replies ONLY if all 7 invariants are met:
  1. Master automation is enabled.
  2. Global emergency stop is inactive.
  3. Sender is an explicitly authorized contact.
  4. Message category is in the permitted allowlist.
  5. Reply does not require personal knowledge, commitments, or calendar confirmation.
  6. Safety checks pass (no prompt injection, no credential/OTP request).
  7. Rate limits (global and contact-specific) are not exceeded.

---

## 3. Authenticated Device Connection & Workflow

- **Dynamic Encrypted Pairing**: Tokens are dynamically generated with time-to-live (`/api/device/pair-request` & `/api/device/pair`).
- **Device-to-Backend Sync**: Phone contacts sync via `POST /api/device/sync-contacts` using `Bearer <deviceToken>`.
- **Real-Time Ingress**: Incoming SMS and WhatsApp notifications push to `POST /api/device/message-ingress`.
- **Device Delivery Confirmation**: Approved or auto-replies enter a pending dispatch queue (`GET /api/device/pending-dispatches`). Outbound messages are marked as sent only after the device confirms successful dispatch (`POST /api/device/confirm-dispatch`).
