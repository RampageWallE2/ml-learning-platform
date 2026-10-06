"""Bound API request bodies before a route can create or modify data."""

from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge


def init_request_limits(app: Flask) -> None:
    limit = app.config["API_MAX_REQUEST_BYTES"]
    if type(limit) is not int or limit <= 0:
        raise ValueError("API_MAX_REQUEST_BYTES must be a positive integer.")

    @app.before_request
    def limit_api_body():
        if request.path != "/api" and not request.path.startswith("/api/"):
            return None

        if request.content_length is not None and request.content_length > limit:
            raise RequestEntityTooLarge()

        # One bounded probe byte distinguishes exact-limit streams from larger
        # bodies when the WSGI server signals that it can terminate the input.
        request.max_content_length = limit + 1
        # Cached, bounded bytes remain available to get_json(). Reading here also
        # protects routes such as logout that otherwise ignore an attached body.
        # Werkzeug keeps its safe fallback for unknown, unterminated WSGI inputs.
        body = request.get_data(cache=True)
        request.max_content_length = limit
        if len(body) > limit:
            raise RequestEntityTooLarge()
        return None

    @app.errorhandler(RequestEntityTooLarge)
    def body_too_large(error: RequestEntityTooLarge):
        if request.path != "/api" and not request.path.startswith("/api/"):
            return error.get_response()
        response = jsonify({
            "error": "Request body is too large.",
            "code": "request_too_large",
        })
        response.headers["Cache-Control"] = "no-store"
        return response, 413
