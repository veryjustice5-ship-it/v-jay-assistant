import re
from typing import Dict, Any, List

class MessageClassifier:
    """
    Modular message classifier supporting 11 distinct categories.
    Designed with an interchangeable interface so rule-based and LLM-based classifiers
    implement the same contract.
    """

    CATEGORIES = [
        "greetings",
        "casual_conversation",
        "questions",
        "school_related",
        "work_related",
        "scheduling",
        "requests_for_information",
        "business_inquiries",
        "unknown_or_ambiguous",
        "sensitive_personal",
        "suspicious_messages"
    ]

    # Regex / keyword heuristics for rule-based triage
    SUSPICIOUS_PATTERNS = [
        r"ignore (all )?(previous|your) instructions",
        r"reveal (your |the )?(system|private|prompt|config)",
        r"you are now in (developer|dan|jailbreak) mode",
        r"bypass (safety|rules|filters)",
        r"system override",
        r"dump database",
        r"sudo",
        r"root access"
    ]

    SENSITIVE_PATTERNS = [
        r"(verification|security|auth(entication)?) code",
        r"otp",
        r"password",
        r"passcode",
        r"credit card|cvv|bank account|wire transfer",
        r"social security|ssn",
        r"urgent wire",
        r"send me \$\d+",
        r"confidential",
        r"medical diagnosis|hospital"
    ]

    GREETING_PATTERNS = [
        r"^(hi|hey|hello|good morning|good afternoon|good evening|greetings|howdy|sup)\b",
        r"^hey there",
        r"^what'?s up"
    ]

    SCHEDULING_PATTERNS = [
        r"\b(are you (free|coming|available)|can we meet|let's meet|reschedule|tomorrow|next week|at \d{1,2}(:\d{2})?\s*(am|pm)?)\b",
        r"\b(calendar|appointment|lunch today|coffee)\b"
    ]

    SCHOOL_PATTERNS = [
        r"\b(homework|assignment|exam|quiz|professor|lecture|syllabus|grade|class|study group|midterm|final)\b"
    ]

    WORK_PATTERNS = [
        r"\b(project|client|deadline|sprint|standup|jira|pr|merge|deploy|boss|manager|deliverable|kpi|q[1-4])\b"
    ]

    BUSINESS_PATTERNS = [
        r"\b(quote|invoice|rfp|partnership|vendor|contract|pricing|proposal|b2b)\b"
    ]

    QUESTION_PATTERNS = [
        r"^(what|when|where|who|why|how|can you|could you|would you|is it|are there)\b",
        r"\?$"
    ]

    INFO_REQUEST_PATTERNS = [
        r"\b(send me the link|what's the address|where is the doc|can you share|send the file|what time does)\b"
    ]

    def classify(self, text: str, sender_name: str = "", history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Classifies incoming message text and returns structured metadata.
        """
        if not text or not text.strip():
            return {
                "category": "unknown_or_ambiguous",
                "confidence": 0.1,
                "is_sensitive": False,
                "is_suspicious": False,
                "reasoning": "Empty or whitespace-only message."
            }

        cleaned = text.strip()
        lower = cleaned.lower()

        # 1. Suspicious / Prompt Injection Check
        for pattern in self.SUSPICIOUS_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "suspicious_messages",
                    "confidence": 0.98,
                    "is_sensitive": False,
                    "is_suspicious": True,
                    "reasoning": f"Prompt injection or system-override attempt detected by pattern: '{pattern}'"
                }

        # 2. Sensitive / Security / OTP Check
        for pattern in self.SENSITIVE_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "sensitive_personal",
                    "confidence": 0.95,
                    "is_sensitive": True,
                    "is_suspicious": False,
                    "reasoning": f"Message requests or contains private credentials/financial/sensitive data matching: '{pattern}'"
                }

        # 3. Scheduling & Availability (Requires personal calendar knowledge)
        for pattern in self.SCHEDULING_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "scheduling",
                    "confidence": 0.90,
                    "is_sensitive": False,
                    "is_suspicious": False,
                    "reasoning": "Message pertains to scheduling, calendar availability, or personal commitments."
                }

        # 4. School-related
        for pattern in self.SCHOOL_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "school_related",
                    "confidence": 0.88,
                    "is_sensitive": False,
                    "is_suspicious": False,
                    "reasoning": "Academic or coursework context identified."
                }

        # 5. Work-related
        for pattern in self.WORK_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "work_related",
                    "confidence": 0.88,
                    "is_sensitive": False,
                    "is_suspicious": False,
                    "reasoning": "Professional workplace or project terminology identified."
                }

        # 6. Business inquiries
        for pattern in self.BUSINESS_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "business_inquiries",
                    "confidence": 0.87,
                    "is_sensitive": False,
                    "is_suspicious": False,
                    "reasoning": "Commercial, pricing, or vendor inquiry detected."
                }

        # 7. Greetings
        for pattern in self.GREETING_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "greetings",
                    "confidence": 0.95,
                    "is_sensitive": False,
                    "is_suspicious": False,
                    "reasoning": "Standard social greeting or salutation."
                }

        # 8. Requests for Information
        for pattern in self.INFO_REQUEST_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "requests_for_information",
                    "confidence": 0.85,
                    "is_sensitive": False,
                    "is_suspicious": False,
                    "reasoning": "Direct request for shared links, addresses, or assets."
                }

        # 9. General Questions
        for pattern in self.QUESTION_PATTERNS:
            if re.search(pattern, lower, re.IGNORECASE):
                return {
                    "category": "questions",
                    "confidence": 0.80,
                    "is_sensitive": False,
                    "is_suspicious": False,
                    "reasoning": "Inquiry or informational question detected."
                }

        # 10. Casual conversation vs Unknown
        if len(cleaned.split()) >= 3:
            return {
                "category": "casual_conversation",
                "confidence": 0.75,
                "is_sensitive": False,
                "is_suspicious": False,
                "reasoning": "General conversational exchange."
            }

        return {
            "category": "unknown_or_ambiguous",
            "confidence": 0.40,
            "is_sensitive": False,
            "is_suspicious": False,
            "reasoning": "Short or underspecified message without distinct category keywords."
        }
