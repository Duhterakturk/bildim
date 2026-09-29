from datetime import timedelta

from flask_jwt_extended import create_access_token

from tests.helpers import register_user, auth_headers


def test_name_update_is_private_and_survives_login(client):
    first = register_user(client, email="name-one@example.com").get_json()
    second = register_user(client, email="name-two@example.com").get_json()
    resp = client.patch("/api/auth/me", headers=auth_headers(first["access_token"]), json={
        "full_name": "  Deniz   Kaya  ", "id": second["user"]["id"], "role": "teacher",
    })
    assert resp.status_code == 200
    assert resp.get_json()["full_name"] == "Deniz Kaya"
    assert resp.get_json()["role"] == "student"
    assert "password" not in resp.get_json() and "password_hash" not in resp.get_json()
    other = client.get("/api/auth/me", headers=auth_headers(second["access_token"])).get_json()
    assert other["full_name"] == "Test User"
    logged_in = client.post("/api/auth/login", json={"email": "name-one@example.com", "password": "Test1234"})
    assert logged_in.get_json()["user"]["full_name"] == "Deniz Kaya"


def test_name_update_rejects_missing_auth_invalid_names_and_password(client, student):
    assert client.patch("/api/auth/me", json={"full_name": "Deniz"}).status_code == 401
    for name in ("", "   ", "a" * 256, 123, None, "Test1234", "Test1234 Test1234"):
        resp = client.patch("/api/auth/me", headers=auth_headers(student["token"]), json={"full_name": name})
        assert resp.status_code == 400
    unchanged = client.get("/api/auth/me", headers=auth_headers(student["token"])).get_json()
    assert unchanged["full_name"] == "Test User"


def test_registration_rejects_password_as_display_name(client):
    for name in ("Test1234", "Test1234 Test1234"):
        assert register_user(client, full_name=name).status_code == 400


def test_register_creates_user_and_returns_tokens(client):
    resp = register_user(client, email="new@example.com")
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["user"]["email"] == "new@example.com"
    assert data["user"]["role"] == "student"
    assert "access_token" in data
    assert "refresh_token" in data


def test_register_duplicate_email_fails(client):
    register_user(client, email="dup@example.com")
    resp = register_user(client, email="dup@example.com")
    assert resp.status_code == 409


def test_register_invalid_role_fails(client):
    resp = register_user(client, email="bad-role@example.com", role="admin")
    assert resp.status_code == 400


def test_login_success(client):
    register_user(client, email="login@example.com", password="Secret123")
    resp = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": "Secret123"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.get_json()


def test_login_wrong_password_fails(client):
    register_user(client, email="login2@example.com", password="Secret123")
    resp = client.post(
        "/api/auth/login", json={"email": "login2@example.com", "password": "wrong"}
    )
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(client, student):
    resp = client.get("/api/auth/me", headers=auth_headers(student["token"]))
    assert resp.status_code == 200
    assert resp.get_json()["email"] == "student@example.com"


def test_refresh_returns_a_new_refresh_token(client):
    registered = register_user(client, email="slide@example.com").get_json()
    resp = client.post("/api/auth/refresh", headers=auth_headers(registered["refresh_token"]))
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["refresh_token"] != registered["refresh_token"]
    me = client.get("/api/auth/me", headers=auth_headers(data["access_token"]))
    assert me.status_code == 200
    assert me.get_json()["email"] == "slide@example.com"


def test_expired_token_returns_401(client, app):
    with app.app_context():
        token = create_access_token(identity="gone", expires_delta=timedelta(seconds=-1))
    resp = client.get("/api/auth/me", headers=auth_headers(token))
    assert resp.status_code == 401


def test_invalid_token_returns_401(client):
    resp = client.get("/api/auth/me", headers=auth_headers("not-a-jwt"))
    assert resp.status_code == 401
