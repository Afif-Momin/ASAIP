import pytest

DISCLAIMER = "Illustrative estimates based on configurable pricing assumptions. Actual cloud costs may vary by region, usage, and provider pricing."


def _architecture(client) -> dict:
    projects = client.get("/api/projects").json()
    demo = next(project for project in projects if project["name"] == "Smart E-Commerce Platform")
    return demo["architectures"][0]


def test_cost_estimation_and_provider_validation(client):
    architecture = _architecture(client)
    response = client.post(f"/api/architectures/{architecture['id']}/estimate-cost", json={"provider": "Microsoft Azure"})
    assert response.status_code == 200, response.text
    cost = response.json()
    assert cost["architecture_id"] == architecture["id"]
    assert cost["provider"] == "Azure" and cost["currency"] == "INR"
    assert cost["annual_cost"] == pytest.approx(cost["monthly_cost"] * 12)
    assert sum(item["monthly_cost"] for item in cost["breakdown"]) == pytest.approx(cost["monthly_cost"])
    assert {item["component"] for item in cost["breakdown"]} == {"Compute", "Database", "Storage", "Networking", "Load Balancer", "Cache", "API Gateway", "Monitoring"}
    assert cost["budget_utilization"] >= 0 and cost["optimization_suggestions"]
    assert cost["disclaimer"] == DISCLAIMER
    assert client.post(f"/api/architectures/{architecture['id']}/estimate-cost", json={"provider": "Unknown"}).status_code == 400


def test_scalability_scenarios(client):
    architecture = _architecture(client)
    response = client.post(f"/api/architectures/{architecture['id']}/analyze-scalability", json={})
    assert response.status_code == 200, response.text
    analysis = response.json()
    assert [item["name"] for item in analysis["scenarios"]] == ["Current Load", "5× Growth", "10× Growth"]
    current, five, ten = analysis["scenarios"]
    assert five["expected_users"] == current["expected_users"] * 5
    assert ten["expected_users"] == current["expected_users"] * 10
    assert ten["requests_per_second"] > current["requests_per_second"]
    assert ten["estimated_monthly_cost"] > current["estimated_monthly_cost"]
    assert all(item["infrastructure_changes"] and item["bottlenecks"] and item["performance_risks"] for item in analysis["scenarios"])


def test_fresh_architecture_review(client):
    architecture = _architecture(client)
    first_response = client.post(f"/api/architectures/{architecture['id']}/review")
    second_response = client.post(f"/api/architectures/{architecture['id']}/review")
    assert first_response.status_code == second_response.status_code == 200
    first, second = first_response.json(), second_response.json()
    assert first["analysis_mode"] == second["analysis_mode"] == "demo"
    assert second["reviewed_at"] >= first["reviewed_at"]
    assert second["reviewed_at"] != first["reviewed_at"]
    assert 0 <= second["risk_score"] <= 100
    assert len(second["issues"]) >= 3
    for issue in second["issues"]:
        assert issue["severity"] in {"Critical", "High", "Medium", "Low"}
        assert all(issue[key] for key in ("title", "affected_component", "explanation", "why_it_matters", "recommended_fix", "expected_improvement"))


def test_architecture_evolution(client):
    architecture = _architecture(client)
    response = client.post(f"/api/architectures/{architecture['id']}/evolution", json={})
    assert response.status_code == 200, response.text
    evolution = response.json()
    assert [stage["stage"] for stage in evolution["stages"]] == [1, 2, 3, 4]
    assert evolution["stages"][-1]["cost_impact"] > evolution["stages"][0]["cost_impact"]
    assert all(stage["changes"] and stage["reasons"] and stage["new_components"] and stage["benefits"] for stage in evolution["stages"])
    assert "not an assumption that microservices" in evolution["summary"]
