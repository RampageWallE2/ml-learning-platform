from flask import Flask, jsonify

from .config import Config
from .commands import register_commands
from .extensions import cors, db, migrate
from .request_security import REQUEST_HEADER, init_request_security
from .request_limits import init_request_limits
from .auth.login_limit import validate_login_limit_config


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    validate_login_limit_config(app)
    init_request_security(app)
    init_request_limits(app)
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        supports_credentials=True,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ORIGINS"],
                "allow_headers": ["Content-Type", REQUEST_HEADER],
            }
        },
    )

    # Flask-Migrate needs the models imported before it inspects metadata.
    from . import models  # noqa: F401
    from .routes.auth import auth_blueprint
    from .routes.progress import progress_blueprint

    app.register_blueprint(auth_blueprint)
    app.register_blueprint(progress_blueprint)
    register_commands(app)

    @app.get("/api/v1/health")
    def health():
        return jsonify({"status": "ok"})

    return app
