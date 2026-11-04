from __future__ import annotations

import json

import httpx
import pytest

from app.models import Project
from app.schemas import ArchitectureGenerationPayload
from app.services.ai_provider import (
    AIProviderError,
    OpenRouterProvider,
    active_model_name,
    get_ai_provider,
    provider_config_error,
    resolve_provider_name,
)
from app.services.architecture_generator import generate_fallback_architectures
from app.services.requirements_service import analyze_requirements


def test_auto_selection_prefers_openrouter_then_anthropic(monkeypatch):
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "an-key")
    assert resolve_provider_name() == "openrouter"
    assert isinstance(get_ai_provider(), OpenRouterProvider)
    assert active_model_name() == "openai/gpt-4o-mini"

    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    assert resolve_provider_name() == "anthropic"
    assert active_model_name() == "claude-3-5-haiku-latest"

    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert resolve_provider_name() == "demo"
    assert get_ai_provider() is None
    assert active_model_name() is None


def test_explicit_demo_disables_live_providers(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "demo")
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "an-key")
    assert resolve_provider_name() == "demo"
    assert get_ai_provider() is None
    assert provider_config_error() is None


def test_explicit_openrouter_without_key_is_a_clear_error(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openrouter")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(AIProviderError, match="OPENROUTER_API_KEY"):
        get_ai_provider()
    assert "not configured" in provider_config_error()

    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(AIProviderError, match="ANTHROPIC_API_KEY"):
        get_ai_provider()


def test_unsupported_provider_value_falls_back_to_auto(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "open-ai")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert resolve_provider_name() == "demo"


def test_config_endpoint_reports_selected_provider(client, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openrouter")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    config = client.get("/api/config").json()
    assert config["ai_provider"] == "openrouter"
    assert config["ai_configured"] is False
    assert config["analysis_mode"] == "demo"
    assert "OPENROUTER_API_KEY" in config["provider_error"]

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    config = client.get("/api/config").json()
    assert config["ai_provider"] == "openrouter"
    assert config["ai_configured"] is True
    assert config["analysis_mode"] == "ai"
    assert config["provider_error"] is None


def _openrouter_json(provider_response: dict):
    return {
        "id": "gen-1",
        "model": "openai/gpt-4o-mini",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": json.dumps(provider_response)}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
    }


def _project(project_payload: dict) -> Project:
    return Project(**project_payload)


def test_openrouter_architecture_generation_uses_chat_completions_contract(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    payload = ArchitectureGenerationPayload(architectures=generate_fallback_architectures(project))
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(200, json=_openrouter_json(payload.model_dump(mode="json")))

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    provider = OpenRouterProvider(transport=httpx.MockTransport(handler))
    drafts = provider.generate_architectures(project, analysis)

    assert len(drafts) == 3
    assert {draft.pattern for draft in drafts} == {draft.pattern for draft in payload.architectures}
    assert len(captured) == 1
    body = json.loads(captured[0].content)
    assert captured[0].url.path.endswith("/chat/completions")
    assert captured[0].headers["authorization"] == "Bearer or-key"
    assert body["model"] == "openai/gpt-4o-mini"
    assert body["response_format"] == {"type": "json_object"}
    assert body["messages"][0]["role"] == "system"
    assert "untrusted data" in body["messages"][0]["content"]
    assert project.description in body["messages"][1]["content"]


def test_openrouter_requirements_analysis_marks_ai_mode(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    handler = lambda request: httpx.Response(200, json=_openrouter_json(analysis.model_dump(mode="json")))
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    result = OpenRouterProvider(transport=httpx.MockTransport(handler)).analyze_requirements(project)
    assert result.analysis_mode == "ai"
    assert result.summary == analysis.summary


def test_openrouter_repairs_invalid_json_once(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    payload = ArchitectureGenerationPayload(architectures=generate_fallback_architectures(project))
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(json.loads(request.content)["messages"][-1]["content"])
        if len(calls) <= 2:
            return httpx.Response(200, json=_openrouter_json({"unexpected": "shape"}))
        return httpx.Response(200, json=_openrouter_json(payload.model_dump(mode="json")))

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    drafts = OpenRouterProvider(transport=httpx.MockTransport(handler)).generate_architectures(project, analysis)
    assert len(drafts) == 3
    assert len(calls) == 3
    assert "Repair this invalid JSON" in calls[2]


def test_openrouter_authentication_failure_is_reported_safely(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    handler = lambda request: httpx.Response(401, json={"error": {"message": "nope"}})
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    provider = OpenRouterProvider(transport=httpx.MockTransport(handler))
    with pytest.raises(AIProviderError, match="rejected the API key") as exc:
        provider.analyze_requirements(project)
    assert "nope" not in str(exc.value)


def test_openrouter_out_of_credit_is_reported(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    handler = lambda request: httpx.Response(402, json={"error": {"message": "Insufficient credit"}})
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    provider = OpenRouterProvider(transport=httpx.MockTransport(handler))
    with pytest.raises(AIProviderError, match="no remaining credit"):
        provider.analyze_requirements(project)


def test_api_generation_returns_503_when_selected_provider_is_missing_a_key(client, created_project, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openrouter")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    generate = client.post(f"/api/projects/{created_project['id']}/generate-architectures")
    assert generate.status_code == 503
    assert "OPENROUTER_API_KEY" in generate.json()["detail"]
    analyze = client.post(f"/api/projects/{created_project['id']}/analyze-requirements")
    assert analyze.status_code == 503


def test_openrouter_network_failure_is_wrapped(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unreachable", request=request)

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    provider = OpenRouterProvider(transport=httpx.MockTransport(handler))
    with pytest.raises(AIProviderError, match="Could not reach OpenRouter"):
        provider.analyze_requirements(project)
