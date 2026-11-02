from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(80), nullable=False)
    target_users: Mapped[str] = mapped_column(Text, nullable=False)
    concurrent_users: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    daily_requests: Mapped[int] = mapped_column(Integer, nullable=False, default=10000)
    functional_requirements: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    non_functional_requirements: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    budget: Mapped[float] = mapped_column(Float, nullable=False, default=100000)
    team_size: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    preferred_languages: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    cloud_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="AWS")
    data_sensitivity: Mapped[str] = mapped_column(String(50), nullable=False, default="Medium")
    availability: Mapped[str] = mapped_column(String(80), nullable=False, default="99.9%")
    growth: Mapped[str] = mapped_column(String(100), nullable=False, default="Moderate")
    deployment_preference: Mapped[str] = mapped_column(String(100), nullable=False, default="Cloud")
    requirements_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    architectures: Mapped[list[Architecture]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Architecture.id"
    )
    comparison: Mapped[Comparison | None] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )


class Architecture(Base):
    __tablename__ = "architectures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    pattern: Mapped[str] = mapped_column(String(100), nullable=False)
    technology_stack: Mapped[dict[str, list[str]]] = mapped_column(JSON, nullable=False)
    infrastructure_components: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    scalability_strategy: Mapped[str] = mapped_column(Text, nullable=False)
    security_strategy: Mapped[str] = mapped_column(Text, nullable=False)
    maintainability_assessment: Mapped[str] = mapped_column(Text, nullable=False)
    advantages: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    disadvantages: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    complexity: Mapped[str] = mapped_column(String(40), nullable=False)
    initial_development_cost: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_infrastructure_cost: Mapped[float] = mapped_column(Float, nullable=False)
    recommended_use_cases: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    tradeoffs: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    suitability_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    diagram: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    scores: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False)
    analysis_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="demo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    cost_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    scalability_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    critic_review: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    evolution_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    project: Mapped[Project] = relationship(back_populates="architectures")


class Comparison(Base):
    __tablename__ = "comparisons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    weights: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False)
    results: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    recommended_architecture_id: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    project: Mapped[Project] = relationship(back_populates="comparison")
