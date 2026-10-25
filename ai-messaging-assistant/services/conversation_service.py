import uuid
import json
import time
from typing import Dict, Any, List, Optional, Tuple

try:
    from .classifier import MessageClassifier
    from .response_generator import ResponseGenerator
    from .safety_engine import SafetyEngine
    from integrations.mock_sms import MockSmsAdapter
    from integrations.mock_whatsapp import MockWhatsAppAdapter
except ImportError:
    from services.classifier import MessageClassifier
    from services.response_generator import ResponseGenerator
    from services.safety_engine import SafetyEngine
    from integrations.mock_sms import MockSmsAdapter
    from integrations.mock_whatsapp import MockWhatsAppAdapter

class ConversationService:
    """
    Modular orchestrator executing the 8-stage message-processing pipeline:
    1. Input validation
    2. Message classification
    3. Context retrieval
    4. Reply generation
    5. Safety and permission checks
    6. Draft or automatic-reply decision
    7. Authorized sending integration (mock/simulated)
    8. Audit recording
    """

    def __init__(self, db=None, config=None):
        self.db = db
        self.config = config
        self.classifier = MessageClassifier()
        self.response_generator = ResponseGenerator()
        self.safety_engine = SafetyEngine(db=db)
        self.sms_adapter = MockSmsAdapter()
        self.whatsapp_adapter = MockWhatsAppAdapter()

    # Stage 1: Input Validation
    def stage_input_validation(self, raw_text: str, sender_id: str, channel: str) -> Tuple[bool, str, str]:
        """
        Validates input structure, length bounds, and basic sanitation.
        Returns: (is_valid, sanitized_text, error_message)
        """
        if not raw_text or not isinstance(raw_text, str):
            return False, "", "Empty message content is rejected."

        sanitized = raw_text.strip()
        if len(sanitized) == 0:
            return False, "", "Whitespace-only message is rejected."

        if len(sanitized) > 4000:
            return False, sanitized[:4000], "Message exceeds maximum length constraint (4000 chars)."

        if channel not in ("sms", "whatsapp"):
            return False, sanitized, f"Unsupported messaging channel: {channel}"

        # Deduplication check
        if self.safety_engine.is_duplicate(sender_id, channel, sanitized):
            return False, sanitized, "Duplicate message detected within debounce window."

        return True, sanitized, ""

    # Stage 2: Message Classification
    def stage_classification(self, text: str, sender_name: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        return self.classifier.classify(text, sender_name=sender_name, history=history)

    # Stage 3: Context Retrieval
    def stage_context_retrieval(self, contact_id: str, channel: str) -> Dict[str, Any]:
        """
        Retrieves contact info, permission status, and conversation history.
        """
        if self.db:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
                contact_row = cursor.fetchone()
                contact = dict(contact_row) if contact_row else None
                
                # Fetch recent messages
                cursor.execute("""
                    SELECT sender_type, body, timestamp FROM messages 
                    WHERE conversation_id = (SELECT id FROM conversations WHERE contact_id = ? LIMIT 1)
                    ORDER BY timestamp DESC LIMIT 5
                """, (contact_id,))
                history = [dict(r) for r in cursor.fetchall()]
        else:
            contact = {
                "id": contact_id,
                "name": "Simulated Contact",
                "phone_number": "+1555019283",
                "channel": channel,
                "is_permitted_for_auto": 1 if contact_id in ("contact-sarah", "contact-mom") else 0
            }
            history = []

        return {
            "contact": contact or {
                "id": contact_id,
                "name": "Unknown Contact",
                "phone_number": "Unknown",
                "channel": channel,
                "is_permitted_for_auto": 0
            },
            "history": history
        }

    # Stage 4: Reply Generation
    def stage_reply_generation(
        self,
        text: str,
        classification: Dict[str, Any],
        sender_name: str,
        history: List[Dict[str, str]],
        style: str = "concise"
    ) -> Dict[str, Any]:
        return self.response_generator.generate_response(
            message_text=text,
            classification=classification,
            sender_name=sender_name,
            conversation_history=history,
            style=style
        )

    # Stage 5 & 6: Safety Check and Draft/Auto Decision
    def stage_safety_and_decision(
        self,
        contact: Dict[str, Any],
        category: str,
        classification: Dict[str, Any],
        generated_reply: Dict[str, Any],
        override_mode: Optional[str] = None,
        override_enabled: Optional[bool] = None,
        override_stop: Optional[bool] = None,
        override_allowed_categories: Optional[List[str]] = None
    ) -> Tuple[bool, str, str]:
        """
        Evaluates system invariants and decides whether reply is draft or auto-eligible.
        """
        # Determine effective system state
        if self.db:
            mode = self.db.get_state("automation_mode", "approval_required")
            automation_enabled = self.db.get_state("automation_enabled", "1") == "1"
            emergency_stop_active = self.db.get_state("emergency_stop", "0") == "1"
            allowed_cat_json = self.db.get_state("allowed_categories", '["greetings"]')
            try:
                allowed_categories = set(json.loads(allowed_cat_json))
            except Exception:
                allowed_categories = {"greetings"}
        else:
            mode = override_mode or (self.config.DEFAULT_AUTOMATION_MODE if self.config else "approval_required")
            automation_enabled = override_enabled if override_enabled is not None else (self.config.AUTOMATION_ENABLED if self.config else True)
            emergency_stop_active = override_stop if override_stop is not None else (self.config.EMERGENCY_STOP_ACTIVE if self.config else False)
            allowed_categories = set(override_allowed_categories or (self.config.ALLOWED_AUTO_CATEGORIES if self.config else {"greetings"}))

        is_permitted = bool(contact.get("is_permitted_for_auto", 0))

        return self.safety_engine.evaluate_automatic_reply_eligibility(
            mode=mode,
            automation_enabled=automation_enabled,
            emergency_stop_active=emergency_stop_active,
            is_contact_permitted=is_permitted,
            category=category,
            allowed_categories=allowed_categories,
            classification=classification,
            requires_personal_decision=generated_reply.get("requires_personal_decision", False),
            contact_id=contact.get("id", "unknown")
        )

    # Stage 7 & 8: Dispatch & Audit
    def process_incoming_message(
        self,
        raw_text: str,
        sender_id: str,
        sender_name: str,
        channel: str,
        style: str = "concise",
        override_mode: Optional[str] = None,
        override_enabled: Optional[bool] = None,
        override_stop: Optional[bool] = None,
        override_allowed_categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Executes the end-to-end pipeline.
        """
        pipeline_start = time.time()
        stage_trace = []

        # 1. Validation
        valid, sanitized_text, val_err = self.stage_input_validation(raw_text, sender_id, channel)
        stage_trace.append({"stage": "input_validation", "passed": valid, "detail": val_err or "Message structure valid"})
        if not valid:
            return {
                "success": False,
                "error": val_err,
                "stage_trace": stage_trace,
                "decision": "REJECTED_AT_INGRESS"
            }

        # 2. Classification
        classification = self.stage_classification(sanitized_text, sender_name, [])
        stage_trace.append({
            "stage": "classification",
            "category": classification["category"],
            "confidence": classification["confidence"],
            "is_suspicious": classification.get("is_suspicious", False),
            "is_sensitive": classification.get("is_sensitive", False)
        })

        # 3. Context Retrieval
        context = self.stage_context_retrieval(sender_id, channel)
        contact = context["contact"]
        contact["name"] = sender_name or contact.get("name", "Unknown")
        stage_trace.append({
            "stage": "context_retrieval",
            "contact_name": contact["name"],
            "contact_permitted_for_auto": bool(contact.get("is_permitted_for_auto"))
        })

        # 4. Reply Generation
        reply_data = self.stage_reply_generation(sanitized_text, classification, contact["name"], context["history"], style=style)
        stage_trace.append({
            "stage": "reply_generation",
            "suggested_text": reply_data["suggested_text"],
            "requires_personal_decision": reply_data["requires_personal_decision"]
        })

        # 5 & 6. Safety & Decision
        is_auto_eligible, decision, decision_reason = self.stage_safety_and_decision(
            contact=contact,
            category=classification["category"],
            classification=classification,
            generated_reply=reply_data,
            override_mode=override_mode,
            override_enabled=override_enabled,
            override_stop=override_stop,
            override_allowed_categories=override_allowed_categories
        )
        stage_trace.append({
            "stage": "safety_and_decision",
            "decision": decision,
            "is_auto_eligible": is_auto_eligible,
            "reason": decision_reason
        })

        # 7. Authorized sending integration
        send_result = None
        if decision == "AUTO_SEND_ELIGIBLE":
            # In prototype mode, simulate sending
            adapter = self.sms_adapter if channel == "sms" else self.whatsapp_adapter
            send_result = adapter.send_message(
                recipient=contact.get("phone_number", sender_id),
                message=reply_data["suggested_text"],
                is_simulated=True
            )
            self.safety_engine.record_auto_send(contact.get("id", sender_id))
            stage_trace.append({
                "stage": "sending_integration",
                "action": "SIMULATED_DISPATCH",
                "channel": channel,
                "transmission_id": send_result["transmission_id"]
            })

        # 8. Record audit log
        if self.db:
            self.db.add_audit_log(
                event_type="MESSAGE_PROCESSED",
                channel=channel,
                action_taken=decision,
                details=f"Category: {classification['category']}. Reason: {decision_reason}",
                is_simulated=True
            )

        elapsed_ms = round((time.time() - pipeline_start) * 1000, 2)

        return {
            "success": True,
            "message_id": f"msg-{uuid.uuid4().hex[:8]}",
            "channel": channel,
            "sender_name": contact["name"],
            "incoming_text": sanitized_text,
            "classification": classification,
            "reply": reply_data,
            "decision": decision,
            "is_auto_eligible": is_auto_eligible,
            "decision_reason": decision_reason,
            "send_result": send_result,
            "stage_trace": stage_trace,
            "elapsed_ms": elapsed_ms
        }
