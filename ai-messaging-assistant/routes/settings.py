import json
from flask import Blueprint, request, jsonify, current_app

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/', methods=['GET'])
def get_settings():
    db = current_app.db
    return jsonify({
        "automation_mode": db.get_state('automation_mode', 'approval_required'),
        "automation_enabled": db.get_state('automation_enabled', '1') == '1',
        "emergency_stop": db.get_state('emergency_stop', '0') == '1',
        "allowed_categories": json.loads(db.get_state('allowed_categories', '["greetings"]')),
        "communication_style": db.get_state('communication_style', 'concise')
    })

@settings_bp.route('/mode', methods=['POST'])
def set_mode():
    data = request.get_json() or {}
    mode = data.get('mode')
    if mode not in ('draft_only', 'approval_required', 'restricted_auto'):
        return jsonify({"success": False, "error": "Invalid automation mode"}), 400
    
    db = current_app.db
    db.set_state('automation_mode', mode)
    db.add_audit_log("SETTINGS_UPDATE", "system", f"AUTOMATION_MODE_CHANGED_TO_{mode.upper()}")
    return jsonify({"success": True, "mode": mode})

@settings_bp.route('/toggle-automation', methods=['POST'])
def toggle_automation():
    data = request.get_json() or {}
    enabled = data.get('enabled', True)
    db = current_app.db
    db.set_state('automation_enabled', '1' if enabled else '0')
    db.add_audit_log("SETTINGS_UPDATE", "system", "AUTOMATION_ENABLED" if enabled else "AUTOMATION_DISABLED")
    return jsonify({"success": True, "enabled": enabled})

@settings_bp.route('/emergency-stop', methods=['POST'])
def emergency_stop():
    data = request.get_json() or {}
    activate = data.get('active', True)
    db = current_app.db
    db.set_state('emergency_stop', '1' if activate else '0')
    db.add_audit_log("EMERGENCY_CONTROL", "system", "EMERGENCY_STOP_ENGAGED" if activate else "EMERGENCY_STOP_DISENGAGED")
    return jsonify({"success": True, "emergency_stop": activate})
