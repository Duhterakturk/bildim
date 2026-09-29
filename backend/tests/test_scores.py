from tests.helpers import auth_headers, register_user
from tests.payloads import post_score


def test_submit_score_requires_auth(client):
    resp = client.post("/api/scores", json={"attempt_id": "missing"})
    assert resp.status_code == 401


def test_submit_score_creates_record(client, student, app):
    auth = auth_headers(student["token"])
    resp = post_score(client, auth, 1, app, duration=500)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["score"]["points"] == 500
    assert data["score"]["duration_seconds"] == 500
    assert data["score"]["game_id"] == 1
    assert isinstance(data["new_badges"], list)


def test_submit_score_unknown_attempt_returns_404(client, student):
    resp = client.post(
        "/api/scores",
        json={"attempt_id": "missing", "answer": {}},
        headers=auth_headers(student["token"]),
    )
    assert resp.status_code == 404
    assert resp.get_json()["code"] == "puzzle_missing"


def test_my_scores_filters_by_user(client, student, app):
    auth = auth_headers(student["token"])
    post_score(client, auth, 1, app, duration=900)
    resp = client.get("/api/scores/me", headers=auth)
    assert resp.status_code == 200
    assert len(resp.get_json()) == 1

    other = register_user(client, email="other@example.com")
    resp_other = client.get("/api/scores/me", headers=auth_headers(other.get_json()["access_token"]))
    assert resp_other.get_json() == []


def test_leaderboard_is_hidden_outside_the_teachers_class(client, teacher, student, app):
    sudoku_id = client.get("/api/games/sudoku").get_json()["id"]
    student_auth = auth_headers(student["token"])
    post_score(client, student_auth, sudoku_id, app, duration=700)
    post_score(client, student_auth, sudoku_id, app, answer=None)

    assert client.get("/api/scores/leaderboard/sudoku").status_code == 401
    assert client.get("/api/scores/leaderboard/sudoku", headers=student_auth).status_code == 403

    classroom = client.post(
        "/api/classrooms",
        json={"name": "3-A"},
        headers=auth_headers(teacher["token"]),
    ).get_json()
    client.post(
        "/api/classrooms/join",
        json={"join_code": classroom["join_code"]},
        headers=student_auth,
    )

    outsider = register_user(client, email="outsider@example.com", full_name="Baska Ogrenci").get_json()
    post_score(client, auth_headers(outsider["access_token"]), sudoku_id, app, duration=10)

    resp = client.get("/api/scores/leaderboard/sudoku", headers=auth_headers(teacher["token"]))
    assert resp.status_code == 200
    rows = resp.get_json()
    assert [s["points"] for s in rows] == [300]
    assert rows[0]["display_name"] == "Test"
    assert "user_id" not in rows[0]


def test_same_attempt_cannot_score_twice(client, student, app):
    auth = auth_headers(student["token"])
    opened = client.post("/api/puzzles", json={"game_id": 1, "difficulty": "easy"}, headers=auth)
    attempt_id = opened.get_json()["id"]
    first = client.post("/api/scores", json={"attempt_id": attempt_id}, headers=auth)
    second = client.post("/api/scores", json={"attempt_id": attempt_id}, headers=auth)
    assert first.status_code == 201
    assert first.get_json()["score"]["completed"] is False
    assert second.status_code == 409
    assert second.get_json()["code"] == "score_already"
    listed = client.get("/api/scores/me", headers=auth)
    assert len(listed.get_json()) == 1


def test_rejected_answer_returns_a_grade_code(client, student, app):
    auth = auth_headers(student["token"])
    resp = post_score(client, auth, 1, app, answer={"board": []})
    assert resp.status_code == 400
    body = resp.get_json()
    assert body["error"]
    assert body["code"].startswith("grade_")
