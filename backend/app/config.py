from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env", override=False)


def database_url() -> str:
    """Resolve relative SQLite paths against the backend directory."""
    url = os.getenv("ASAIP_DATABASE_URL", "sqlite:///./asaip.db")
    prefix = "sqlite:///"
    if url.startswith(prefix) and not url.startswith("sqlite:////"):
        raw_path = url[len(prefix) :]
        if raw_path != ":memory:" and not Path(raw_path).is_absolute():
            return prefix + str((BACKEND_DIR / raw_path).resolve())
    return url


def cors_origins() -> list[str]:
    configured = os.getenv(
        "ASAIP_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


PROVIDER_ALIASES = {
    "auto": "auto",
    "": "auto",
    "demo": "demo",
    "off": "demo",
    "none": "demo",
    "anthropic": "anthropic",
    "claude": "anthropic",
    "openrouter": "openrouter",
}


def ai_provider_selection() -> str:
    """Return the configured provider: auto, demo, anthropic, or openrouter."""
    raw = os.getenv("AI_PROVIDER", "auto").strip().lower()
    return PROVIDER_ALIASES.get(raw, "auto")


def anthropic_key() -> str | None:
    return os.getenv("ANTHROPIC_API_KEY") or None


def anthropic_model() -> str:
    return os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest")


def openrouter_key() -> str | None:
    return os.getenv("OPENROUTER_API_KEY") or None


def openrouter_model() -> str:
    return os.getenv("OPENROUTER_MODEL", "recursive/flint-v1.0:free")


def openrouter_fallback_models() -> list[str]:
    """Free models tried in order when the primary is rate-limited or unavailable."""
    raw = os.getenv("OPENROUTER_FALLBACK_MODELS", "cohere/north-mini-code:free,openrouter/free")
    return [model.strip() for model in raw.split(",") if model.strip()]


def openrouter_base_url() -> str:
    return os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")


def max_output_tokens() -> int:
    try:
        return max(1024, min(int(os.getenv("AI_MAX_TOKENS", "16000")), 32000))
    except ValueError:
        return 16000
