def _demo(client) -> dict:
    return next(project for project in client.get("/api/projects").json() if project["name"] == "Smart E-Commerce Platform")


def test_json_export_contains_actual_complete_analysis(client):
    demo = _demo(client)
    response = client.get(f"/api/projects/{demo['id']}/export-json")
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/json")
    exported = response.json()
    assert exported["project"]["name"] == "Smart E-Commerce Platform"
    assert len(exported["project"]["architectures"]) == 3
    assert exported["comparison"]["recommended_architecture_id"]
    assert len(exported["architecture_analyses"]) == 3
    for analysis in exported["architecture_analyses"].values():
        assert set(analysis) == {"cost", "scalability", "critic", "evolution"}
        assert analysis["cost"]["breakdown"]
        assert analysis["critic"]["issues"]


def test_pdf_export_is_real_pdf(client):
    demo = _demo(client)
    response = client.post(f"/api/projects/{demo['id']}/export-report", json={"format": "pdf"})
    assert response.status_code == 200, response.text[:500]
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 10000
    assert "attachment" in response.headers["content-disposition"]
    assert client.post(f"/api/projects/{demo['id']}/export-report", json={"format": "docx"}).status_code == 422
