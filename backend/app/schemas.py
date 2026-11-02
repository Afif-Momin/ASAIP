from __future__ import annotations

import math
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def split_text(value: object) -> object:
    if isinstance(value, str):
        return [item.strip() for item in value.replace(";", "\n").splitlines() if item.strip()]
    return value


class RequirementsAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    functional_requirements: list[str] = Field(default_factory=list)
    non_functional_requirements: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    missing_requirements: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
    summary: str
    analysis_mode: Literal["demo", "ai"]


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=10, max_length=12000)
    domain: str = Field(default="Custom", min_length=1, max_length=80)
    target_users: str = Field(default="General users", min_length=1, max_length=2000)
    concurrent_users: int = Field(default=100, ge=1, le=100_000_000)
    daily_requests: int = Field(default=10_000, ge=1, le=100_000_000_000)
    functional_requirements: list[str] = Field(default_factory=list, max_length=100)
    non_functional_requirements: list[str] = Field(default_factory=list, max_length=100)
    budget: float = Field(default=100_000, ge=0, le=1_000_000_000_000)
    team_size: int = Field(default=3, ge=1, le=10_000)
    preferred_languages: list[str] = Field(default_factory=list, max_length=20)
    cloud_provider: str = Field(default="AWS", max_length=50)
    data_sensitivity: str = Field(default="Medium", max_length=50)
    availability: str = Field(default="99.9%", max_length=80)
    growth: str = Field(default="Moderate", max_length=100)
    deployment_preference: str = Field(default="Cloud", max_length=100)

    @field_validator("name", "description", "domain", "target_users")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @field_validator("functional_requirements", "non_functional_requirements", "preferred_languages", mode="before")
    @classmethod
    def accept_natural_language_lists(cls, value: object) -> object:
        return split_text(value)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, min_length=10, max_length=12000)
    domain: str | None = Field(default=None, min_length=1, max_length=80)
    target_users: str | None = Field(default=None, min_length=1, max_length=2000)
    concurrent_users: int | None = Field(default=None, ge=1, le=100_000_000)
    daily_requests: int | None = Field(default=None, ge=1, le=100_000_000_000)
    functional_requirements: list[str] | None = Field(default=None, max_length=100)
    non_functional_requirements: list[str] | None = Field(default=None, max_length=100)
    budget: float | None = Field(default=None, ge=0, le=1_000_000_000_000)
    team_size: int | None = Field(default=None, ge=1, le=10_000)
    preferred_languages: list[str] | None = Field(default=None, max_length=20)
    cloud_provider: str | None = Field(default=None, max_length=50)
    data_sensitivity: str | None = Field(default=None, max_length=50)
    availability: str | None = Field(default=None, max_length=80)
    growth: str | None = Field(default=None, max_length=100)
    deployment_preference: str | None = Field(default=None, max_length=100)

    @field_validator("functional_requirements", "non_functional_requirements", "preferred_languages", mode="before")
    @classmethod
    def accept_natural_language_lists(cls, value: object) -> object:
        return split_text(value)


class Position(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x: float
    y: float


class DiagramNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=160)
    type: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=2000)
    position: Position


class DiagramEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    source: str = Field(min_length=1, max_length=100)
    target: str = Field(min_length=1, max_length=100)
    label: str | None = Field(default=None, max_length=160)


class Diagram(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nodes: list[DiagramNode] = Field(min_length=2, max_length=100)
    edges: list[DiagramEdge] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def validate_connections(self) -> Diagram:
        node_ids = {node.id for node in self.nodes}
        if len(node_ids) != len(self.nodes):
            raise ValueError("diagram node IDs must be unique")
        for edge in self.edges:
            if edge.source not in node_ids or edge.target not in node_ids:
                raise ValueError(f"edge {edge.id} references an unknown node")
        return self


class TechnologyStack(BaseModel):
    model_config = ConfigDict(extra="forbid")
    frontend: list[str] = Field(min_length=1)
    backend: list[str] = Field(min_length=1)
    database: list[str] = Field(min_length=1)
    api: list[str] = Field(min_length=1)
    authentication: list[str] = Field(min_length=1)
    deployment: list[str] = Field(min_length=1)


class ArchitectureDraft(BaseModel):
    """Validated provider/fallback payload before persistence and deterministic scoring."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=10)
    pattern: str = Field(min_length=1, max_length=100)
    technology_stack: TechnologyStack
    infrastructure_components: list[str] = Field(min_length=1)
    scalability_strategy: str = Field(min_length=10)
    security_strategy: str = Field(min_length=10)
    maintainability_assessment: str = Field(min_length=10)
    advantages: list[str] = Field(min_length=2)
    disadvantages: list[str] = Field(min_length=1)
    complexity: str = Field(min_length=1, max_length=40)
    initial_development_cost: float = Field(ge=0)
    monthly_infrastructure_cost: float = Field(ge=0)
    recommended_use_cases: list[str] = Field(min_length=1)
    tradeoffs: list[str] = Field(min_length=1)
    suitability_explanation: str = Field(min_length=10)
    diagram: Diagram


class ScoreSet(BaseModel):
    scalability: float = Field(ge=1, le=10)
    security: float = Field(ge=1, le=10)
    maintainability: float = Field(ge=1, le=10)
    cost_efficiency: float = Field(ge=1, le=10)
    reliability: float = Field(ge=1, le=10)
    performance: float = Field(ge=1, le=10)
    development_complexity: float = Field(
        ge=1, le=10, description="Higher is better: 10 means low delivery complexity."
    )


class ArchitectureResponse(ArchitectureDraft):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    scores: ScoreSet
    analysis_mode: Literal["demo", "ai"]
    created_at: datetime
    cost_analysis: CostAnalysis | None = None
    scalability_analysis: ScalabilityAnalysis | None = None
    critic_review: CriticReview | None = None
    evolution_analysis: EvolutionAnalysis | None = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requirements_analysis: RequirementsAnalysis | None = None
    created_at: datetime
    updated_at: datetime
    architectures: list[ArchitectureResponse] = Field(default_factory=list)


class ArchitectureGenerationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    architectures: list[ArchitectureDraft] = Field(min_length=3, max_length=6)


class ComparisonWeights(BaseModel):
    scalability: float = Field(default=20, ge=0, le=100)
    security: float = Field(default=20, ge=0, le=100)
    maintainability: float = Field(default=15, ge=0, le=100)
    cost_efficiency: float = Field(default=20, ge=0, le=100)
    reliability: float = Field(default=10, ge=0, le=100)
    performance: float = Field(default=10, ge=0, le=100)
    development_complexity: float = Field(default=5, ge=0, le=100)

    @model_validator(mode="after")
    def validate_total(self) -> ComparisonWeights:
        total = sum(getattr(self, field) for field in type(self).model_fields)
        if not math.isclose(total, 100.0, abs_tol=0.001):
            raise ValueError(f"weights must total 100; received {total:g}")
        return self


class ComparisonResult(BaseModel):
    architecture_id: int
    architecture_name: str
    scores: ScoreSet
    weighted_score: float
    rank: int


class ComparisonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    weights: ComparisonWeights
    results: list[ComparisonResult]
    recommended_architecture_id: int
    explanation: str


class CostRequest(BaseModel):
    provider: str | None = Field(default=None, max_length=50)


class CostBreakdownItem(BaseModel):
    component: str
    monthly_cost: float
    details: str


class CostAnalysis(BaseModel):
    architecture_id: int
    provider: str
    currency: Literal["INR"] = "INR"
    setup_cost: float
    monthly_cost: float
    annual_cost: float
    breakdown: list[CostBreakdownItem]
    budget_utilization: float
    optimization_suggestions: list[str]
    disclaimer: Literal[
        "Illustrative estimates based on configurable pricing assumptions. Actual cloud costs may vary by region, usage, and provider pricing."
    ] = "Illustrative estimates based on configurable pricing assumptions. Actual cloud costs may vary by region, usage, and provider pricing."


class ScalabilityScenario(BaseModel):
    name: str
    expected_users: int
    requests_per_second: float
    infrastructure_changes: list[str]
    bottlenecks: list[str]
    scaling_strategy: str
    estimated_monthly_cost: float
    performance_risks: list[str]


class ScalabilityAnalysis(BaseModel):
    architecture_id: int
    scenarios: list[ScalabilityScenario]
    explanation: str


class CriticIssue(BaseModel):
    title: str
    severity: Literal["Critical", "High", "Medium", "Low"]
    affected_component: str
    explanation: str
    why_it_matters: str
    recommended_fix: str
    expected_improvement: str


class CriticReview(BaseModel):
    architecture_id: int
    risk_score: int = Field(ge=0, le=100)
    summary: str
    issues: list[CriticIssue]
    reviewed_at: datetime
    analysis_mode: Literal["demo", "ai"]


class EvolutionStage(BaseModel):
    stage: int
    name: str
    description: str
    changes: list[str]
    reasons: list[str]
    new_components: list[str]
    benefits: list[str]
    complexity: str
    cost_impact: float


class EvolutionAnalysis(BaseModel):
    architecture_id: int
    stages: list[EvolutionStage]
    summary: str


class ReportRequest(BaseModel):
    format: Literal["pdf"] = "pdf"


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "ASAIP API"
    version: str
    database: Literal["connected"] = "connected"


class ConfigResponse(BaseModel):
    analysis_mode: Literal["demo", "ai"]
    ai_configured: bool
    ai_model: str | None
    currency: Literal["INR"] = "INR"
    supported_providers: list[str]


# Resolve forward references in persisted optional analysis fields.
ArchitectureResponse.model_rebuild()
