from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DIR = Path(tempfile.mkdtemp(prefix="asaip-tests-"))
os.environ["ASAIP_DATABASE_URL"] = f"sqlite:///{(TEST_DIR / 'test.db').as_posix()}"
os.environ["AI_PROVIDER"] = "demo"  # baseline; load_dotenv(override=False) keeps this

from app.main import app  # noqa: E402  (importing app.config runs load_dotenv on backend/.env)

# config.load_dotenv pulls any real keys from backend/.env into the environment. Strip them so the
# suite stays offline and deterministic; provider tests monkeypatch their own keys per test.
os.environ.pop("OPENROUTER_API_KEY", None)
os.environ.pop("ANTHROPIC_API_KEY", None)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def project_payload() -> dict:
    return {
        "name": "Neighborhood Learning Hub",
        "description": "An education platform with courses, enrolment, quizzes, progress tracking, instructor analytics, and notifications for adult learners.",
        "domain": "Education",
        "target_users": "Students, instructors, and programme administrators",
        "concurrent_users": 800,
        "daily_requests": 120000,
        "functional_requirements": ["Course delivery", "Quizzes and progress", "Instructor analytics"],
        "non_functional_requirements": ["Responsive learning experience", "Secure student records"],
        "budget": 65000,
        "team_size": 4,
        "preferred_languages": ["Python", "TypeScript"],
        "cloud_provider": "AWS",
        "data_sensitivity": "Medium",
        "availability": "99.9%",
        "growth": "High growth",
        "deployment_preference": "Cloud",
    }


@pytest.fixture
def created_project(client: TestClient, project_payload: dict) -> dict:
    response = client.post("/api/projects", json=project_payload)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def generated_project(client: TestClient, created_project: dict) -> tuple[dict, list[dict]]:
    response = client.post(f"/api/projects/{created_project['id']}/generate-architectures")
    assert response.status_code == 200, response.text
    return created_project, response.json()
