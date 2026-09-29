from flask import jsonify


def fail(code, message, status=400, **extra):
    body = {"error": message, "code": code}
    if extra:
        body.update(extra)
    return jsonify(body), status
