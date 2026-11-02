def test_project_crud(client, project_payload):
    created = client.post("/api/projects", json=project_payload)
    assert created.status_code == 201, created.text
    project = created.json()
    assert project["functional_requirements"] == project_payload["functional_requirements"]
    assert project["architectures"] == []

    fetched = client.get(f"/api/projects/{project['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == project_payload["name"]
    assert any(item["id"] == project["id"] for item in client.get("/api/projects").json())

    updated = client.put(f"/api/projects/{project['id']}", json={"name": "Renamed Learning Hub", "team_size": 5})
    assert updated.status_code == 200
    assert updated.json()["name"] == "Renamed Learning Hub"
    assert updated.json()["team_size"] == 5

    deleted = client.delete(f"/api/projects/{project['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/projects/{project['id']}").status_code == 404
    assert client.delete(f"/api/projects/{project['id']}").status_code == 404


def test_natural_language_lists_and_requirement_analysis(client, project_payload):
    project_payload["functional_requirements"] = "Course authoring\nLive classes\nCertificates"
    project_payload["non_functional_requirements"] = "Low latency\nSecure learner data"
    created = client.post("/api/projects", json=project_payload).json()
    response = client.post(f"/api/projects/{created['id']}/analyze-requirements")
    assert response.status_code == 200, response.text
    analysis = response.json()
    assert analysis["analysis_mode"] == "demo"
    assert "Course authoring" in analysis["functional_requirements"]
    assert len(analysis["constraints"]) >= 5
    assert analysis["missing_requirements"] and analysis["risks"] and analysis["questions"]
    assert "Neighborhood Learning Hub" in analysis["summary"]
    persisted = client.get(f"/api/projects/{created['id']}").json()["requirements_analysis"]
    assert persisted["summary"] == analysis["summary"]
