from typing import Dict, Any
from .mock_sms import MockSmsAdapter
from .mock_whatsapp import MockWhatsAppAdapter

class IntegrationStatusService:
    def __init__(self):
        self.sms_adapter = MockSmsAdapter()
        self.whatsapp_adapter = MockWhatsAppAdapter()

    def get_full_status(self) -> Dict[str, Any]:
        return {
            "sms": self.sms_adapter.check_permissions(),
            "whatsapp": self.whatsapp_adapter.check_permissions(),
            "simulated_mode": True,
            "security_posture": "Strict Human-in-the-Loop Safe"
        }
