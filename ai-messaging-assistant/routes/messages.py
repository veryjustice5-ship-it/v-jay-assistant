from flask import Blueprint, request, jsonify, current_app

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/process', methods=['POST'])
def process_message():
    data = request.get_json() or {}
    text = data.get('text', '')
    sender_id = data.get('sender_id', 'contact-default')
    sender_name = data.get('sender_name', 'Simulated Contact')
    channel = data.get('channel', 'sms')
    style = data.get('style', 'concise')

    service = current_app.conversation_service
    result = service.process_incoming_message(
        raw_text=text,
        sender_id=sender_id,
        sender_name=sender_name,
        channel=channel,
        style=style
    )

    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@messages_bp.route('/manual-action', methods=['POST'])
def manual_action():
    data = request.get_json() or {}
    action = data.get('action') # 'approve', 'edit_and_approve', 'reject'
    message_id = data.get('message_id')
    reply_text = data.get('reply_text', '')
    channel = data.get('channel', 'sms')

    db = current_app.db
    if action in ('approve', 'edit_and_approve'):
        adapter = current_app.conversation_service.sms_adapter if channel == 'sms' else current_app.conversation_service.whatsapp_adapter
        send_result = adapter.send_message(recipient="Manual-Approved-Recipient", message=reply_text, is_simulated=True)
        db.add_audit_log(
            event_type="MANUAL_SEND",
            channel=channel,
            action_taken=f"MANUAL_APPROVE_{action.upper()}",
            details=f"User manually authorized: '{reply_text[:50]}...'",
            message_id=message_id,
            is_simulated=True
        )
        return jsonify({"success": True, "action": action, "send_result": send_result})

    elif action == 'reject':
        db.add_audit_log(
            event_type="MANUAL_REJECT",
            channel=channel,
            action_taken="USER_REJECTED_REPLY",
            details="User rejected AI-generated reply.",
            message_id=message_id,
            is_simulated=True
        )
        return jsonify({"success": True, "action": "rejected"})

    return jsonify({"success": False, "error": "Invalid action"}), 400
