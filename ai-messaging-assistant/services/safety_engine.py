import time
import hashlib
from typing import Dict, Any, List, Set, Tuple

class SafetyEngine:
    """
    Server-side safety enforcement and automation permission evaluation.
    Enforces rate limits, emergency stops, contact authorization, category allowlists,
    and prompt injection barriers.
    """

    def __init__(self, db=None):
        self.db = db
        # In-memory tracking of recent auto-replies for rate-limiting
        # Structure: [(timestamp, contact_id)]
        self._auto_reply_history: List[Tuple[float, str]] = []
        self.seen_signatures: Set[str] = set()

    def generate_message_signature(self, contact_id: str, channel: str, text: str) -> str:
        raw = f"{contact_id}:{channel}:{text.strip().lower()}"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()

    def is_duplicate(self, contact_id: str, channel: str, text: str, window_seconds: int = 60) -> bool:
        """
        Detects exact duplicate messages sent rapidly.
        """
        sig = self.generate_message_signature(contact_id, channel, text)
        if sig in self.seen_signatures:
            return True
        self.seen_signatures.add(sig)
        return False

    def check_rate_limits(
        self,
        contact_id: str,
        max_global_per_hour: int = 10,
        max_contact_per_hour: int = 3,
        window_seconds: int = 3600
    ) -> Tuple[bool, str]:
        """
        Verifies that automatic sending has not exceeded safety thresholds.
        """
        now = time.time()
        # Filter entries older than window
        self._auto_reply_history = [
            (ts, cid) for (ts, cid) in self._auto_reply_history if now - ts < window_seconds
        ]

        # Check global limit
        if len(self._auto_reply_history) >= max_global_per_hour:
            return False, f"Global rate limit reached ({len(self._auto_reply_history)}/{max_global_per_hour} auto-replies in past hour)."

        # Check contact-specific limit
        contact_count = sum(1 for (ts, cid) in self._auto_reply_history if cid == contact_id)
        if contact_count >= max_contact_per_hour:
            return False, f"Contact rate limit reached ({contact_count}/{max_contact_per_hour} auto-replies to this sender in past hour)."

        return True, "Rate limits within allowable bounds."

    def record_auto_send(self, contact_id: str):
        self._auto_reply_history.append((time.time(), contact_id))

    def evaluate_automatic_reply_eligibility(
        self,
        mode: str,                       # 'draft_only', 'approval_required', 'restricted_auto'
        automation_enabled: bool,
        emergency_stop_active: bool,
        is_contact_permitted: bool,
        category: str,
        allowed_categories: Set[str],
        classification: Dict[str, Any],
        requires_personal_decision: bool,
        contact_id: str
    ) -> Tuple[bool, str, str]:
        """
        Evaluates whether a message is eligible for automatic transmission.
        Returns: (is_eligible, action_decision, reason)
        Action decisions: 'AUTO_SEND_ELIGIBLE', 'DRAFT_ONLY', 'REQUIRES_APPROVAL', 'BLOCKED_BY_SAFETY'
        """

        # Rule 1: Emergency Stop is absolute
        if emergency_stop_active:
            return False, "BLOCKED_BY_SAFETY", "EMERGENCY STOP is currently ACTIVE. All automatic transmission is globally suspended."

        # Rule 2: Automation enabled master switch
        if not automation_enabled:
            return False, "DRAFT_ONLY", "Automation is toggled OFF. Generating draft for manual handling."

        # Rule 3: Prompt injection or security threats are never auto-replied
        if classification.get("is_suspicious"):
            return False, "BLOCKED_BY_SAFETY", "Security violation: message classified as suspicious/prompt injection attempt."

        # Rule 4: Sensitive credentials or verification codes require human intervention
        if classification.get("is_sensitive"):
            return False, "REQUIRES_APPROVAL", "Sensitive information or verification code involved. Human escalation strictly required."

        # Rule 5: Mode A is strictly draft only
        if mode == "draft_only":
            return False, "DRAFT_ONLY", "System is configured in Mode A (Draft Only). Nothing is sent automatically."

        # Rule 6: Mode B requires explicit manual approval
        if mode == "approval_required":
            return False, "REQUIRES_APPROVAL", "System is configured in Mode B (Approval Required). Suggested response queued for review."

        # Rule 7: Mode C (Restricted Automatic Replies) - Check strict multi-point criteria
        if mode == "restricted_auto":
            # Condition 7a: Contact permission
            if not is_contact_permitted:
                return False, "REQUIRES_APPROVAL", "Sender is not on the authorized auto-reply contact list (Contact restriction enforced)."

            # Condition 7b: Category restriction
            if category not in allowed_categories:
                return False, "REQUIRES_APPROVAL", f"Category '{category}' is not in the permitted auto-reply category allowlist."

            # Condition 7c: Personal decision or calendar check
            if requires_personal_decision:
                return False, "REQUIRES_APPROVAL", "Message requires personal knowledge or unverified calendar availability."

            # Condition 7d: Rate limits
            rate_ok, rate_reason = self.check_rate_limits(contact_id)
            if not rate_ok:
                return False, "REQUIRES_APPROVAL", f"Safety rate limiter triggered: {rate_reason}"

            # All 7 conditions satisfied
            return True, "AUTO_SEND_ELIGIBLE", "All safety invariants satisfied: sender authorized, category permitted, no personal decision required, rate limits respected."

        return False, "DRAFT_ONLY", f"Unknown mode '{mode}'. Defaulting to safe draft."
