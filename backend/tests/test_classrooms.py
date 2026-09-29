from tests.helpers import auth_headers


def test_create_classroom_requires_teacher_role(client, student):
    resp = client.post(
        "/api/classrooms", json={"name": "3-A"}, headers=auth_headers(student["token"])
    )
    assert resp.status_code == 403


def test_create_classroom_returns_join_code(client, teacher):
    resp = client.post(
        "/api/classrooms", json={"name": "3-A"}, headers=auth_headers(teacher["token"])
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["name"] == "3-A"
    assert len(data["join_code"]) == 6
    assert data["student_count"] == 0


def test_student_can_join_with_valid_code(client, teacher, student):
    classroom = client.post(
        "/api/classrooms", json={"name": "3-A"}, headers=auth_headers(teacher["token"])
    ).get_json()

    resp = client.post(
        "/api/classrooms/join",
        json={"join_code": classroom["join_code"]},
        headers=auth_headers(student["token"]),
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["classroom_id"] == classroom["id"]
    assert body["classroom_name"] == "3-A"
    assert "join_code" not in body


def test_join_with_invalid_code_fails(client, student):
    resp = client.post(
        "/api/classrooms/join",
        json={"join_code": "ZZZZZZ"},
        headers=auth_headers(student["token"]),
    )
    assert resp.status_code == 404


def test_join_classroom_requires_student_role(client, teacher):
    classroom = client.post(
        "/api/classrooms", json={"name": "3-A"}, headers=auth_headers(teacher["token"])
    ).get_json()
    resp = client.post(
        "/api/classrooms/join",
        json={"join_code": classroom["join_code"]},
        headers=auth_headers(teacher["token"]),
    )
    assert resp.status_code == 403


def test_student_can_leave_classroom(client, teacher, student):
    classroom = client.post(
        "/api/classrooms", json={"name": "3-A"}, headers=auth_headers(teacher["token"])
    ).get_json()
    client.post(
        "/api/classrooms/join",
        json={"join_code": classroom["join_code"]},
        headers=auth_headers(student["token"]),
    )
    resp = client.post("/api/classrooms/leave", headers=auth_headers(student["token"]))
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["classroom_id"] is None
    assert body["classroom_name"] is None


def test_teacher_only_sees_own_classroom_students(client, teacher, student, app):
    from tests.helpers import register_user

    other_teacher = register_user(client, email="other-teacher@example.com", role="teacher").get_json()
    other_classroom = client.post(
        "/api/classrooms",
        json={"name": "Other Class"},
        headers=auth_headers(other_teacher["access_token"]),
    ).get_json()

    my_classroom = client.post(
        "/api/classrooms", json={"name": "My Class"}, headers=auth_headers(teacher["token"])
    ).get_json()

    # Student joins the OTHER teacher's classroom, not mine.
    client.post(
        "/api/classrooms/join",
        json={"join_code": other_classroom["join_code"]},
        headers=auth_headers(student["token"]),
    )

    resp = client.get("/api/progress/students", headers=auth_headers(teacher["token"]))
    assert resp.status_code == 200
    assert resp.get_json() == []  # my classroom has no students yet

    resp_other = client.get(
        "/api/progress/students", headers=auth_headers(other_teacher["access_token"])
    )
    assert len(resp_other.get_json()) == 1
    assert resp_other.get_json()[0]["student"]["email"] == "student@example.com"


def test_students_overview_empty_when_teacher_has_no_classroom(client, teacher):
    resp = client.get("/api/progress/students", headers=auth_headers(teacher["token"]))
    assert resp.status_code == 200
    assert resp.get_json() == []


def test_classroom_id_filter_rejects_other_teachers_classroom(client, teacher):
    from tests.helpers import register_user

    other_teacher = register_user(client, email="other2@example.com", role="teacher").get_json()
    other_classroom = client.post(
        "/api/classrooms",
        json={"name": "Not Mine"},
        headers=auth_headers(other_teacher["access_token"]),
    ).get_json()

    resp = client.get(
        f"/api/progress/students?classroom_id={other_classroom['id']}",
        headers=auth_headers(teacher["token"]),
    )
    assert resp.status_code == 403
