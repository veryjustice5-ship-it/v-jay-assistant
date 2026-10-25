import sqlite3
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

class Database:
    def __init__(self, db_path: str = "messaging_assistant.db"):
        self.db_path = db_path
        self._init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Contacts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone_number TEXT NOT NULL,
                    channel TEXT NOT NULL, -- 'sms' or 'whatsapp'
                    is_permitted_for_auto INTEGER DEFAULT 0, -- 1 = allowed in Mode C
                    relationship TEXT DEFAULT 'acquaintance',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Conversations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    contact_id TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    title TEXT NOT NULL,
                    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(contact_id) REFERENCES contacts(id)
                )
            """)

            # Messages table (incoming or sent)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    sender_type TEXT NOT NULL, -- 'user', 'contact', 'ai_assistant'
                    body TEXT NOT NULL,
                    channel TEXT NOT NULL, -- 'sms', 'whatsapp'
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    category TEXT,
                    is_flagged INTEGER DEFAULT 0,
                    flag_reason TEXT,
                    hash_signature TEXT,
                    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
                )
            """)

            # Generated Replies
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS generated_replies (
                    id TEXT PRIMARY KEY,
                    incoming_message_id TEXT NOT NULL,
                    suggested_text TEXT NOT NULL,
                    alternative_options TEXT, -- JSON array
                    status TEXT NOT NULL, -- 'draft', 'pending_approval', 'approved', 'rejected', 'auto_sent', 'manually_sent'
                    confidence REAL,
                    reasoning TEXT,
                    style_applied TEXT,
                    requires_personal_decision INTEGER DEFAULT 0,
                    sent_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(incoming_message_id) REFERENCES messages(id)
                )
            """)

            # Audit & Activity Logs
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    message_id TEXT,
                    action_taken TEXT NOT NULL,
                    details TEXT,
                    is_simulated INTEGER DEFAULT 1,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # System Settings and State
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_state (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)

            conn.commit()
            
            # Initialize default state if not present
            cursor.execute("INSERT OR IGNORE INTO system_state (key, value) VALUES ('automation_mode', 'approval_required')")
            cursor.execute("INSERT OR IGNORE INTO system_state (key, value) VALUES ('automation_enabled', '1')")
            cursor.execute("INSERT OR IGNORE INTO system_state (key, value) VALUES ('emergency_stop', '0')")
            cursor.execute("INSERT OR IGNORE INTO system_state (key, value) VALUES ('allowed_categories', '[\"greetings\", \"casual_conversation\", \"requests_for_information\"]')")
            cursor.execute("INSERT OR IGNORE INTO system_state (key, value) VALUES ('communication_style', 'concise')")
            conn.commit()

    def get_state(self, key: str, default: str = "") -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_state WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    def set_state(self, key: str, value: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)", (key, value))
            conn.commit()

    def add_audit_log(self, event_type: str, channel: str, action_taken: str, details: str = "", message_id: Optional[str] = None, is_simulated: bool = True):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_logs (event_type, channel, message_id, action_taken, details, is_simulated)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (event_type, channel, message_id, action_taken, details, 1 if is_simulated else 0))
            conn.commit()

    def get_recent_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
            return [dict(row) for row in cursor.fetchall()]
