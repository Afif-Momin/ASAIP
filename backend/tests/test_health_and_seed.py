from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import Project
from app.services.seed import DEMO_PROJECT_NAME, seed_demo


def test_health_config_and_fully_analyzed_demo(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    config = client.get("/api/config").json()
    assert config == {
        "analysis_mode": "demo", "ai_configured": False, "ai_model": None,
        "currency": "INR", "supported_providers": ["AWS", "Azure", "GCP"],
    }
    projects = client.get("/api/projects").json()
    demo = next(project for project in projects if project["name"] == DEMO_PROJECT_NAME)
    assert demo["requirements_analysis"]["analysis_mode"] == "demo"
    assert len(demo["architectures"]) == 3
    assert len({item["pattern"] for item in demo["architectures"]}) == 3
    for architecture in demo["architectures"]:
        assert architecture["analysis_mode"] == "demo"
        assert architecture["cost_analysis"]["currency"] == "INR"
        assert len(architecture["scalability_analysis"]["scenarios"]) == 3
        assert architecture["critic_review"]["issues"]
        assert len(architecture["evolution_analysis"]["stages"]) == 4
    assert client.get(f"/api/projects/{demo['id']}/comparison").status_code == 200


def test_demo_seed_does_not_duplicate_on_restart(client):
    with SessionLocal() as db:
        seed_demo(db)
        seed_demo(db)
        count = db.scalar(select(func.count(Project.id)).where(Project.name == DEMO_PROJECT_NAME))
        assert count == 1
