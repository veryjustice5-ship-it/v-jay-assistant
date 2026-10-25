import time
import uuid
from typing import Dict, Any
from .base_adapter import BaseMessagingAdapter

class MockSmsAdapter(BaseMessagingAdapter):
    """
    Simulated SMS channel adapter.
    Models Android SMS capabilities, permissions, and default SMS handler requirements.
    """

    @property
    def channel_name(self) -> str:
        return "sms"

    def check_permissions(self) -> Dict[str, Any]:
        """
        Reports realistic Android permission requirements for SMS.
        """
        return {
            "channel": "sms",
            "is_connected": True,
            "is_simulated": True,
            "required_android_permissions": [
                "android.permission.RECEIVE_SMS",
                "android.permission.READ_SMS",
                "android.permission.SEND_SMS",
                "android.permission.READ_PHONE_STATE"
            ],
            "role_requirements": {
                "role": "RoleManager.ROLE_SMS",
                "is_default_sms_app": False,
                "notes": (
                    "To send SMS directly in the background without user prompt on modern Android (10+), "
                    "the app must either be set as the Default SMS App, or send messages via SmsManager "
                    "with explicit runtime permission granted by the device owner."
                )
            },
            "environment_notice": "Running in SIMULATED test harness. No physical cellular radio connected."
        }

    def send_message(self, recipient: str, message: str, is_simulated: bool = True) -> Dict[str, Any]:
        """
        Simulates sending an SMS message.
        Always tags execution as simulated.
        """
        transmission_id = f"sms-sim-{uuid.uuid4().hex[:8]}"
        return {
            "success": True,
            "channel": "sms",
            "transmission_id": transmission_id,
            "recipient": recipient,
            "message_body": message,
            "is_simulated": True,
            "delivery_status": "SIMULATED_CARRIER_ACCEPTED",
            "timestamp": time.time(),
            "disclaimer": "SIMULATION ONLY: This message was processed through the test adapter and was NOT dispatched over a cellular network."
        }
