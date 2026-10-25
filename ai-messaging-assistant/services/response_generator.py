from typing import Dict, Any, List

class ResponseGenerator:
    """
    Modular response generator honoring communication styles,
    refusing to invent commitments/calendar facts, and flagging personal decisions.
    """

    def __init__(self, user_name: str = "Alex", default_style: str = "concise"):
        self.user_name = user_name
        self.default_style = default_style

    def generate_response(
        self,
        message_text: str,
        classification: Dict[str, Any],
        sender_name: str = "Friend",
        conversation_history: List[Dict[str, str]] = None,
        style: str = None
    ) -> Dict[str, Any]:
        """
        Synthesizes a response with alternatives, confidence score, and decision flag.
        """
        applied_style = style or self.default_style
        category = classification.get("category", "unknown_or_ambiguous")
        is_suspicious = classification.get("is_suspicious", False)
        is_sensitive = classification.get("is_sensitive", False)

        # 1. Suspicious / Prompt Injection
        if is_suspicious:
            return {
                "suggested_text": "[Automated Security Shield] This request cannot be processed. All system prompts, private keys, and user directives are strictly confidential and protected.",
                "alternative_options": [
                    "I cannot fulfill instructions to bypass safeguards.",
                    "Messages containing administrative override attempts are discarded."
                ],
                "requires_personal_decision": True,
                "confidence": 0.99,
                "reasoning": "Prompt injection detected. Response is a secure refusal. Message flagged for review."
            }

        # 2. Sensitive / Verification Code / Financial
        if is_sensitive:
            return {
                "suggested_text": "I never share verification codes, passwords, or financial credentials via message. Please contact me through a verified channel if you need urgent assistance.",
                "alternative_options": [
                    "Security note: I do not provide passcodes or sensitive information via text.",
                    "Let's speak in person or call before discussing any account or code details."
                ],
                "requires_personal_decision": True,
                "confidence": 0.95,
                "reasoning": "Message requested sensitive security or financial information. Flagged for strict human review."
            }

        # 3. Scheduling & Calendar (Refuse to hallucinate plans)
        if category == "scheduling":
            if applied_style == "casual":
                suggested = "Hey! Let me double check my schedule and get back to you shortly."
                alt1 = "Sounds good, but let me check what time works best before locking it in!"
                alt2 = "Can't confirm right this second, but I'll text you as soon as I check my calendar."
            elif applied_style == "professional":
                suggested = "Thank you for reaching out. I will review my calendar and follow up with my availability shortly."
                alt1 = "Could you suggest a couple of times that work on your end? I'll cross-reference my schedule."
                alt2 = "I need to check my commitments for tomorrow and will confirm as soon as possible."
            elif applied_style == "direct":
                suggested = "Checking my calendar now. Will reply shortly."
                alt1 = "Need to check my schedule first. What time were you thinking?"
                alt2 = "Not sure yet. Let me verify."
            else: # concise
                suggested = "I need to check my calendar first. What time were you thinking?"
                alt1 = "Let me check my availability and follow up shortly."
                alt2 = "Can you share the time and location? I'll check my schedule."

            return {
                "suggested_text": suggested,
                "alternative_options": [alt1, alt2],
                "requires_personal_decision": True,
                "confidence": 0.88,
                "reasoning": "Unknown user availability. System refused to invent schedule commitments without confirmation."
            }

        # 4. Greetings
        if category == "greetings":
            if applied_style == "casual":
                suggested = "Hey there! How's your day going?"
                alt1 = "Hey! What's up?"
                alt2 = "Good to hear from you! Hope you're having a great day."
            elif applied_style == "professional":
                suggested = "Good day. How can I assist you today?"
                alt1 = "Hello, hope you are doing well. What can I do for you?"
                alt2 = "Good morning/afternoon. Let me know how I can help."
            elif applied_style == "direct":
                suggested = "Hi. How can I help?"
                alt1 = "Hey, what's up?"
                alt2 = "Hello."
            else: # concise
                suggested = "Hey! Hope you're doing well. What's up?"
                alt1 = "Hi! How's everything going?"
                alt2 = "Hey there, how can I help?"

            return {
                "suggested_text": suggested,
                "alternative_options": [alt1, alt2],
                "requires_personal_decision": False,
                "confidence": 0.94,
                "reasoning": "Standard conversational greeting generated according to chosen tone."
            }

        # 5. School-related
        if category == "school_related":
            return {
                "suggested_text": "Got your note regarding class. Let me review the materials and get back to you shortly.",
                "alternative_options": [
                    "Thanks for the update on the assignment. Let's compare notes soon.",
                    "Reviewing the syllabus/class notes now, will follow up!"
                ],
                "requires_personal_decision": True,
                "confidence": 0.85,
                "reasoning": "School communication requires factual verification of academic progress or coursework."
            }

        # 6. Work-related
        if category == "work_related":
            return {
                "suggested_text": "Received your update. Reviewing this now and will send over my notes shortly.",
                "alternative_options": [
                    "Thanks for keeping me in the loop on the project. Will review as soon as possible.",
                    "Got it. Let me check the latest status and get back to you."
                ],
                "requires_personal_decision": True,
                "confidence": 0.86,
                "reasoning": "Work tasks require human validation of deliverables and milestones."
            }

        # 7. Requests for Information
        if category == "requests_for_information":
            return {
                "suggested_text": "Sure, let me locate that information and send it right over.",
                "alternative_options": [
                    "I'll pull up the details in a moment and share them with you.",
                    "Let me check where the link/file is saved and forward it."
                ],
                "requires_personal_decision": True,
                "confidence": 0.82,
                "reasoning": "Information retrieval requires locating specific user files or links."
            }

        # 8. Business inquiries
        if category == "business_inquiries":
            return {
                "suggested_text": "Thank you for the inquiry. Could you provide a few more details so I can prepare an accurate response?",
                "alternative_options": [
                    "Thanks for reaching out! What is the scope and timeline you have in mind?",
                    "Received your note. I'll review and get back to you with next steps."
                ],
                "requires_personal_decision": True,
                "confidence": 0.84,
                "reasoning": "Business inquiries require personal terms or pricing assessment."
            }

        # 9. General Questions / Casual
        if category in ("questions", "casual_conversation"):
            return {
                "suggested_text": "Thanks for reaching out! Let me check on that and get back to you in just a bit.",
                "alternative_options": [
                    "Got it! Let me think on that and text you back soon.",
                    "Appreciate the message! Talk to you shortly."
                ],
                "requires_personal_decision": True,
                "confidence": 0.78,
                "reasoning": "General question requires personal input or factual confirmation."
            }

        # Default / Unknown
        return {
            "suggested_text": "Hey, saw your message! Let me know if you need anything specific.",
            "alternative_options": [
                "Got your message! Hope all is well.",
                "Could you clarify a bit more? Just want to make sure I understand."
            ],
            "requires_personal_decision": True,
            "confidence": 0.60,
            "reasoning": "Context is ambiguous or underspecified; requesting clarification."
        }
