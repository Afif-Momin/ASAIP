import pytest


def test_generation_returns_complete_project_specific_alternatives(client, generated_project):
    project, architectures = generated_project
    assert len(architectures) >= 3
    assert len({item["pattern"] for item in architectures}) == len(architectures)
    node_sets = []
    for architecture in architectures:
        assert architecture["project_id"] == project["id"]
        assert architecture["analysis_mode"] == "demo"
        assert architecture["description"] and architecture["suitability_explanation"]
        assert set(architecture["technology_stack"]) == {"frontend", "backend", "database", "api", "authentication", "deployment"}
        assert architecture["infrastructure_components"]
        assert architecture["advantages"] and architecture["disadvantages"] and architecture["tradeoffs"]
        assert architecture["initial_development_cost"] > 0
        assert architecture["monthly_infrastructure_cost"] > 0
        assert all(1 <= score <= 10 for score in architecture["scores"].values())
        node_ids = {node["id"] for node in architecture["diagram"]["nodes"]}
        assert len(node_ids) >= 5
        assert all(edge["source"] in node_ids and edge["target"] in node_ids for edge in architecture["diagram"]["edges"])
        node_sets.append(node_ids)
    assert len({frozenset(nodes) for nodes in node_sets}) >= 2
    fetched = client.get(f"/api/projects/{project['id']}/architectures")
    assert fetched.status_code == 200 and len(fetched.json()) == len(architectures)
    single = client.get(f"/api/architectures/{architectures[0]['id']}")
    assert single.status_code == 200 and single.json()["name"] == architectures[0]["name"]


def test_comparison_weight_validation_calculation_and_persistence(client, generated_project):
    project, _ = generated_project
    invalid = {"scalability": 90, "security": 20}
    response = client.post(f"/api/projects/{project['id']}/compare", json=invalid)
    assert response.status_code == 422
    assert "weights must total 100" in response.text
    out_of_range = {
        "scalability": 101, "security": -1, "maintainability": 0, "cost_efficiency": 0,
        "reliability": 0, "performance": 0, "development_complexity": 0,
    }
    assert client.post(f"/api/projects/{project['id']}/compare", json=out_of_range).status_code == 422
    weights = {
        "scalability": 20, "security": 20, "maintainability": 15, "cost_efficiency": 20,
        "reliability": 10, "performance": 10, "development_complexity": 5,
    }
    compared = client.post(f"/api/projects/{project['id']}/compare", json=weights)
    assert compared.status_code == 200, compared.text
    data = compared.json()
    assert data["project_id"] == project["id"]
    assert len(data["results"]) >= 3
    assert data["results"][0]["rank"] == 1
    assert data["recommended_architecture_id"] == data["results"][0]["architecture_id"]
    for result in data["results"]:
        expected = sum(result["scores"][key] * weight / 100 for key, weight in weights.items())
        assert result["weighted_score"] == pytest.approx(expected, abs=0.001)
    assert "not an automatic preference" in data["explanation"]
    persisted = client.get(f"/api/projects/{project['id']}/comparison")
    assert persisted.status_code == 200
    assert persisted.json()["results"] == data["results"]
