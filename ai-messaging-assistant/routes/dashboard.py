from flask import Blueprint, render_template, current_app, jsonify

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/')
def index():
    db = current_app.db
    logs = db.get_recent_logs(20)
    mode = db.get_state('automation_mode', 'approval_required')
    enabled = db.get_state('automation_enabled', '1') == '1'
    emergency_stop = db.get_state('emergency_stop', '0') == '1'
    
    return render_template('dashboard.html', 
        logs=logs, 
        mode=mode, 
        enabled=enabled, 
        emergency_stop=emergency_stop
    )

@dashboard_bp.route('/api/dashboard/stats')
def stats():
    db = current_app.db
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM messages WHERE channel = 'sms'")
        sms_count = cursor.fetchone()["count"]
        cursor.execute("SELECT COUNT(*) as count FROM messages WHERE channel = 'whatsapp'")
        wa_count = cursor.fetchone()["count"]
        cursor.execute("SELECT COUNT(*) as count FROM generated_replies WHERE status = 'auto_sent'")
        auto_sent = cursor.fetchone()["count"]
        cursor.execute("SELECT COUNT(*) as count FROM generated_replies WHERE status = 'pending_approval'")
        pending_review = cursor.fetchone()["count"]

    return jsonify({
        "sms_count": sms_count,
        "whatsapp_count": wa_count,
        "auto_sent_count": auto_sent,
        "pending_review_count": pending_review,
        "emergency_stop": db.get_state('emergency_stop', '0') == '1',
        "automation_enabled": db.get_state('automation_enabled', '1') == '1',
        "automation_mode": db.get_state('automation_mode', 'approval_required')
    })
