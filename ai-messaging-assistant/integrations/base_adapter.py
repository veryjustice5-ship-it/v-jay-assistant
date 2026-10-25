from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseMessagingAdapter(ABC):
    """
    Abstract Base Class for messaging channel adapters (SMS, WhatsApp).
    Separates simulated sending from real sending.
    """

    @property
    @abstractmethod
    def channel_name(self) -> str:
        """Name of the channel: 'sms' or 'whatsapp'"""
        pass

    @abstractmethod
    def check_permissions(self) -> Dict[str, Any]:
        """Returns permissions and operational status for the channel"""
        pass

    @abstractmethod
    def send_message(self, recipient: str, message: str, is_simulated: bool = True) -> Dict[str, Any]:
        """
        Sends a message through the channel adapter.
        Must clearly tag simulated operations.
        """
        pass
