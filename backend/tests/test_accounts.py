from tests.helpers import auth_headers, register_user


def test_individual_can_register_without_a_grade_and_cannot_become_a_teacher(client):
    created = register_user(
        client,
        email="solo@example.com",
        role="individual",
        grade_level=4,
        full_name="Ada Birey",
    )
    assert created.status_code == 201
    user = created.get_json()["user"]
    assert user["role"] == "individual"
    assert user["grade_level"] is None

    promoted = client.patch(
        "/api/auth/me",
        headers=auth_headers(created.get_json()["access_token"]),
        json={"full_name": "Ada Birey", "role": "teacher"},
    )
    assert promoted.status_code == 200
    assert promoted.get_json()["role"] == "individual"

    again = client.post("/api/auth/login", json={"email": "solo@example.com", "password": "Test1234"})
    assert again.get_json()["user"]["role"] == "individual"


def test_teacher_registration_ignores_a_grade(client):
    created = register_user(client, email="hoca@example.com", role="teacher", grade_level=5)
    assert created.status_code == 201
    assert created.get_json()["user"]["role"] == "teacher"
    assert created.get_json()["user"]["grade_level"] is None


def test_student_grade_is_kept(client):
    created = register_user(client, email="ogrenci@example.com", role="student", grade_level=3)
    assert created.get_json()["user"]["role"] == "student"
    assert created.get_json()["user"]["grade_level"] == 3


def test_individual_and_student_cannot_use_teacher_routes(client):
    individual = register_user(client, email="solo2@example.com", role="individual").get_json()
    student = register_user(client, email="ogrenci2@example.com", role="student").get_json()
    for token in (individual["access_token"], student["access_token"]):
        headers = auth_headers(token)
        assert client.post("/api/classrooms", headers=headers, json={"name": "3-A"}).status_code == 403
        assert client.get("/api/classrooms/mine", headers=headers).status_code == 403
        assert client.get("/api/progress/students", headers=headers).status_code == 403


def test_individual_cannot_join_a_class(client, teacher):
    classroom = client.post(
        "/api/classrooms",
        headers=auth_headers(teacher["token"]),
        json={"name": "3-A"},
    ).get_json()
    individual = register_user(client, email="solo3@example.com", role="individual").get_json()
    joined = client.post(
        "/api/classrooms/join",
        headers=auth_headers(individual["access_token"]),
        json={"join_code": classroom["join_code"]},
    )
    assert joined.status_code == 403
    me = client.get("/api/auth/me", headers=auth_headers(individual["access_token"])).get_json()
    assert me["classroom_id"] is None


def test_individual_can_open_an_easy_puzzle(client):
    individual = register_user(client, email="solo4@example.com", role="individual").get_json()
    opened = client.post(
        "/api/puzzles",
        headers=auth_headers(individual["access_token"]),
        json={"slug": "kare-karalamaca", "difficulty": "easy"},
    )
    assert opened.status_code == 201
    assert opened.get_json()["puzzle"]
