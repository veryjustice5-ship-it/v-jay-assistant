"""
Flask Application Entry Point for Personal AI Messaging Assistant.
"""
import os
from flask import Flask, jsonify
from config import Config
from models import Database
from services import ConversationService

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize SQLite database
    db = Database(app.config['DATABASE_PATH'])
    app.db = db
    app.conversation_service = ConversationService(db=db, config=config_class)

    # Register blueprints
    from routes.dashboard import dashboard_bp
    from routes.messages import messages_bp
    from routes.settings import settings_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')

    @app.route('/health')
    def health_check():
        return jsonify({
            "status": "healthy",
            "app_name": "Personal AI Messaging Assistant",
            "simulated_mode": True
        })

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
