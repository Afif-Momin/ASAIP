from __future__ import annotations

import json

import httpx
import pytest

from app.models import Project
from app.services.ai_provider import (
    AIProviderError,
    OpenRouterProvider,
    active_model_name,
    get_ai_provider,
    provider_config_error,
    resolve_provider_name,
)
from app.services.architecture_generator import generate_fallback_architectures, select_patterns
from app.services.diagram_vocab import CANONICAL_TYPES, TIER_ORDER
from app.services.requirements_service import analyze_requirements


def test_auto_selection_prefers_openrouter_then_anthropic(monkeypatch):
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "an-key")
    assert resolve_provider_name() == "openrouter"
    assert isinstance(get_ai_provider(), OpenRouterProvider)
    assert active_model_name() == "recursive/flint-v1.0:free"

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
        "model": "recursive/flint-v1.0:free",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": json.dumps(provider_response)}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
    }


def _project(project_payload: dict) -> Project:
    return Project(**project_payload)


def test_openrouter_architecture_generation_uses_chat_completions_contract(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    draft = generate_fallback_architectures(project)[0]
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(200, json=_openrouter_json(draft.model_dump(mode="json")))

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    provider = OpenRouterProvider(transport=httpx.MockTransport(handler))
    drafts = provider.generate_architectures(project, analysis)

    patterns = select_patterns(project)
    assert len(drafts) == 3
    assert [item.pattern for item in drafts] == patterns  # one parallel call per pattern, order preserved
    assert len(captured) == 3
    for request in captured:
        body = json.loads(request.content)
        assert request.url.path.endswith("/chat/completions")
        assert request.headers["authorization"] == "Bearer or-key"
        assert body["model"] == "recursive/flint-v1.0:free"
        assert body["response_format"] == {"type": "json_object"}
        assert body["messages"][0]["role"] == "system"
        assert "untrusted data" in body["messages"][0]["content"]
        assert project.description in body["messages"][1]["content"]
        assert "requested_pattern" in body["messages"][1]["content"]
    for item in drafts:
        assert {node.type for node in item.diagram.nodes} <= set(CANONICAL_TYPES)
        assert {node.tier for node in item.diagram.nodes} <= set(TIER_ORDER)
        assert len({node.position.x for node in item.diagram.nodes}) >= 2  # server-assigned tier columns


def test_openrouter_requirements_analysis_marks_ai_mode(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    handler = lambda request: httpx.Response(200, json=_openrouter_json(analysis.model_dump(mode="json")))
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    result = OpenRouterProvider(transport=httpx.MockTransport(handler)).analyze_requirements(project)
    assert result.analysis_mode == "ai"
    assert result.summary == analysis.summary


def test_openrouter_tolerates_hallucinated_extra_fields(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project).model_dump(mode="json")
    analysis["summary_placeholder"] = None  # stray key the free model actually emitted
    analysis["extra_metadata"] = {"confidence": 0.9}
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(json.loads(request.content)["messages"][-1]["content"])
        return httpx.Response(200, json=_openrouter_json(analysis))

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    result = OpenRouterProvider(transport=httpx.MockTransport(handler)).analyze_requirements(project)
    assert result.analysis_mode == "ai"
    assert result.summary == analysis["summary"]
    assert len(calls) == 1  # accepted on the first attempt; no retry or repair needed
    assert not hasattr(result, "summary_placeholder")  # unknown key dropped, never persisted


def test_openrouter_tolerates_extra_fields_in_architecture_draft(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    draft = generate_fallback_architectures(project)[0].model_dump(mode="json")
    draft["confidence_score"] = 0.95  # stray top-level key
    draft["diagram"]["nodes"][0]["color"] = "#ff0000"  # stray nested node key
    draft["diagram"]["legend"] = "extra"  # stray diagram key
    handler = lambda request: httpx.Response(200, json=_openrouter_json(draft))
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    drafts = OpenRouterProvider(transport=httpx.MockTransport(handler)).generate_architectures(project, analysis)
    assert len(drafts) == 3
    for item in drafts:
        assert not hasattr(item, "confidence_score")
        assert {node.type for node in item.diagram.nodes} <= set(CANONICAL_TYPES)
        assert {node.tier for node in item.diagram.nodes} <= set(TIER_ORDER)


def test_openrouter_repairs_invalid_json_once(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(json.loads(request.content)["messages"][-1]["content"])
        if len(calls) <= 2:
            return httpx.Response(200, json=_openrouter_json({"unexpected": "shape"}))
        return httpx.Response(200, json=_openrouter_json(analysis.model_dump(mode="json")))

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    result = OpenRouterProvider(transport=httpx.MockTransport(handler)).analyze_requirements(project)
    assert result.analysis_mode == "ai"
    assert len(calls) == 3
    assert "Repair this invalid JSON" in calls[2]


def _fallback_env(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "primary:free")
    monkeypatch.setenv("OPENROUTER_FALLBACK_MODELS", "fallback-a:free,fallback-b:free")


def test_openrouter_falls_back_to_next_free_model_on_rate_limit(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        model = json.loads(request.content)["model"]
        captured.append(model)
        if model == "primary:free":
            return httpx.Response(429, json={"error": {"message": "rate limited"}})
        return httpx.Response(200, json=_openrouter_json(analysis.model_dump(mode="json")))

    _fallback_env(monkeypatch)
    result = OpenRouterProvider(transport=httpx.MockTransport(handler)).analyze_requirements(project)
    assert result.analysis_mode == "ai"
    assert captured == ["primary:free", "fallback-a:free"]


def test_openrouter_falls_back_on_empty_content(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        model = json.loads(request.content)["model"]
        captured.append(model)
        content = "" if model == "primary:free" else json.dumps(analysis.model_dump(mode="json"))
        return httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": content}}]})

    _fallback_env(monkeypatch)
    result = OpenRouterProvider(transport=httpx.MockTransport(handler)).analyze_requirements(project)
    assert result.analysis_mode == "ai"
    assert captured == ["primary:free", "fallback-a:free"]


def test_openrouter_drops_response_format_when_model_rejects_it(project_payload, monkeypatch):
    project = _project(project_payload)
    analysis = analyze_requirements(project)
    captured: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        captured.append(body)
        if "response_format" in body:
            return httpx.Response(400, json={"error": {"message": "response_format not supported"}})
        return httpx.Response(200, json=_openrouter_json(analysis.model_dump(mode="json")))

    _fallback_env(monkeypatch)
    result = OpenRouterProvider(transport=httpx.MockTransport(handler)).analyze_requirements(project)
    assert result.analysis_mode == "ai"
    assert len(captured) == 2
    assert "response_format" in captured[0]
    assert "response_format" not in captured[1]
    assert captured[0]["model"] == captured[1]["model"] == "primary:free"


def test_openrouter_authentication_failure_is_reported_safely(project_payload, monkeypatch):
    project = _project(project_payload)
    handler = lambda request: httpx.Response(401, json={"error": {"message": "nope"}})
    _fallback_env(monkeypatch)
    provider = OpenRouterProvider(transport=httpx.MockTransport(handler))
    with pytest.raises(AIProviderError, match="rejected the API key") as exc:
        provider.analyze_requirements(project)
    assert "nope" not in str(exc.value)


def test_openrouter_out_of_credit_is_reported(project_payload, monkeypatch):
    project = _project(project_payload)
    handler = lambda request: httpx.Response(402, json={"error": {"message": "Insufficient credit"}})
    _fallback_env(monkeypatch)
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

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unreachable", request=request)

    monkeypatch.setenv("OPENROUTER_API_KEY", "or-key")
    provider = OpenRouterProvider(transport=httpx.MockTransport(handler))
    with pytest.raises(AIProviderError, match="Could not reach OpenRouter"):
        provider.analyze_requirements(project)