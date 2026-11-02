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


def anthropic_key() -> str | None:
    return os.getenv("ANTHROPIC_API_KEY") or None


def anthropic_model() -> str:
    return os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest")


def anthropic_max_tokens() -> int:
    try:
        return max(1024, min(int(os.getenv("ANTHROPIC_MAX_TOKENS", "12000")), 32000))
    except ValueError:
        return 12000
