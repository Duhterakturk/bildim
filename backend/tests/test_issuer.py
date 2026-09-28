import pytest

from app.services import issuer


def test_issue_tries_three_times_before_failing(app, monkeypatch):
    app.config["TESTING"] = False
    calls = {"n": 0}

    def fail(slug, difficulty):
        calls["n"] += 1
        raise issuer.IssueError("Bulmaca açılamadı")

    monkeypatch.setattr(issuer, "_take", lambda slug, difficulty: None)
    monkeypatch.setattr(issuer, "_from_node", fail)

    with pytest.raises(issuer.IssueError):
        issuer.issue("kakuro", "easy")

    assert calls["n"] == 3


def test_issue_returns_the_next_attempt(app, monkeypatch):
    app.config["TESTING"] = False
    calls = {"n": 0}

    def flaky(slug, difficulty):
        calls["n"] += 1
        if calls["n"] == 1:
            raise issuer.IssueError("Bulmaca açılamadı")
        return {"grid": []}, {"grid": [], "solution": []}

    monkeypatch.setattr(issuer, "_take", lambda slug, difficulty: None)
    monkeypatch.setattr(issuer, "_from_node", flaky)
    monkeypatch.setattr(issuer.threading, "Thread", lambda *args, **kwargs: type("Silent", (), {"start": lambda self: None})())

    public, proof = issuer.issue("kakuro", "easy")

    assert calls["n"] == 2
    assert public == {"grid": []}
    assert "solution" in proof
