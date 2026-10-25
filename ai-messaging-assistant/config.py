import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DATABASE_PATH = os.environ.get('DATABASE_PATH', 'messaging_assistant.db')
    
    # Automation modes: 'draft_only', 'approval_required', 'restricted_auto'
    DEFAULT_AUTOMATION_MODE = os.environ.get('AUTOMATION_MODE', 'approval_required')
    
    # Global Killswitch / Emergency Stop
    EMERGENCY_STOP_ACTIVE = False
    
    # Master Automation toggle
    AUTOMATION_ENABLED = True
    
    # Rate Limiting
    MAX_AUTO_REPLIES_PER_HOUR = 10
    MAX_AUTO_REPLIES_PER_CONTACT_PER_HOUR = 3
    RATE_LIMIT_WINDOW_SECONDS = 3600
    
    # Allowed categories for restricted auto replies (Mode C)
    ALLOWED_AUTO_CATEGORIES = {
        'greetings',
        'casual_conversation',
        'requests_for_information'
    }
    
    # Disallowed categories that ALWAYS require human escalation
    ALWAYS_ESCALATE_CATEGORIES = {
        'sensitive_personal',
        'suspicious_or_security',
        'financial_or_code',
        'scheduling_decision',
        'unknown_or_ambiguous'
    }
    
    # User's default tone/style preference
    COMMUNICATION_STYLE = os.environ.get('COMMUNICATION_STYLE', 'concise') # 'concise', 'casual', 'professional', 'direct'
    USER_NAME = os.environ.get('USER_NAME', 'Alex')
