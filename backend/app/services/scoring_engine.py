from __future__ import annotations

from collections.abc import Iterable

from ..models import Architecture, Project
from ..schemas import (
    ComparisonResponse,
    ComparisonResult,
    ComparisonWeights,
    ScoreSet,
)

BASE_SCORES: dict[str, dict[str, float]] = {
    "monolith": {
        "scalability": 4.5, "security": 7.0, "maintainability": 5.5,
        "cost_efficiency": 9.0, "reliability": 5.5, "performance": 7.5,
        "development_complexity": 9.0,
    },
    "layered": {
        "scalability": 4.5, "security": 7.2, "maintainability": 7.0,
        "cost_efficiency": 8.5, "reliability": 6.0, "performance": 7.0,
        "development_complexity": 8.5,
    },
    "modular monolith": {
        "scalability": 6.5, "security": 8.0, "maintainability": 8.5,
        "cost_efficiency": 8.5, "reliability": 7.0, "performance": 8.0,
        "development_complexity": 8.0,
    },
    "microservices": {
        "scalability": 9.5, "security": 8.0, "maintainability": 6.0,
        "cost_efficiency": 4.5, "reliability": 8.5, "performance": 8.0,
        "development_complexity": 3.5,
    },
    "serverless": {
        "scalability": 9.0, "security": 7.5, "maintainability": 7.5,
        "cost_efficiency": 8.0, "reliability": 7.5, "performance": 6.5,
        "development_complexity": 7.0,
    },
    "event-driven": {
        "scalability": 9.0, "security": 7.8, "maintainability": 6.5,
        "cost_efficiency": 6.0, "reliability": 8.5, "performance": 8.5,
        "development_complexity": 4.5,
    },
}


def _pattern_key(pattern: str) -> str:
    value = pattern.lower()
    if "modular" in value:
        return "modular monolith"
    if "microservice" in value:
        return "microservices"
    if "serverless" in value:
        return "serverless"
    if "event" in value:
        return "event-driven"
    if "layered" in value:
        return "layered"
    return "monolith"


def score_architecture(architecture: Architecture, project: Project) -> ScoreSet:
    scores = dict(BASE_SCORES[_pattern_key(architecture.pattern)])
    high_load = project.concurrent_users >= 5000 or project.daily_requests >= 2_000_000
    sensitive = project.data_sensitivity.lower() in {"high", "critical"}
    small_team = project.team_size <= 4
    constrained_budget = project.budget < 50_000
    rapid_growth = any(word in project.growth.lower() for word in ("high", "rapid", "aggressive", "10x"))

    if high_load:
        scores["scalability"] += 0.5 if scores["scalability"] >= 8 else 0
        scores["performance"] += 0.4 if _pattern_key(architecture.pattern) in {"event-driven", "microservices"} else -0.3
    if sensitive and "zero-trust" in architecture.security_strategy.lower():
        scores["security"] += 0.4
    if small_team:
        if _pattern_key(architecture.pattern) in {"microservices", "event-driven"}:
            scores["maintainability"] -= 1.0
            scores["development_complexity"] -= 1.0
            scores["cost_efficiency"] -= 0.5
        elif _pattern_key(architecture.pattern) == "modular monolith":
            scores["maintainability"] += 0.5
            scores["development_complexity"] += 0.5
    if constrained_budget:
        if architecture.monthly_infrastructure_cost > max(project.budget, 1):
            scores["cost_efficiency"] -= 2.0
        elif architecture.monthly_infrastructure_cost <= project.budget:
            scores["cost_efficiency"] += 0.4
    if rapid_growth and scores["scalability"] < 7:
        scores["scalability"] -= 0.8
        scores["reliability"] -= 0.3
    if project.availability.replace("%", "") >= "99.99" and scores["reliability"] < 7:
        scores["reliability"] -= 0.5

    return ScoreSet(**{key: round(max(1.0, min(10.0, value)), 2) for key, value in scores.items()})


def compare_architectures(
    project: Project,
    architectures: Iterable[Architecture],
    weights: ComparisonWeights,
) -> ComparisonResponse:
    options = list(architectures)
    if not options:
        raise ValueError("Generate architectures before running a comparison")
    weight_values = weights.model_dump()
    unranked: list[ComparisonResult] = []
    contributions: dict[int, dict[str, float]] = {}
    for architecture in options:
        scores = ScoreSet.model_validate(architecture.scores)
        score_values = scores.model_dump()
        contributions[architecture.id] = {
            key: score_values[key] * weight_values[key] / 100 for key in weight_values
        }
        weighted_score = round(sum(contributions[architecture.id].values()), 3)
        unranked.append(
            ComparisonResult(
                architecture_id=architecture.id,
                architecture_name=architecture.name,
                scores=scores,
                weighted_score=weighted_score,
                rank=0,
            )
        )
    ranked = sorted(unranked, key=lambda result: (-result.weighted_score, result.architecture_id))
    for rank, result in enumerate(ranked, start=1):
        result.rank = rank
    winner = ranked[0]
    strongest = sorted(
        contributions[winner.architecture_id].items(), key=lambda item: item[1], reverse=True
    )[:2]
    explanation = (
        f"{winner.architecture_name} ranks first with {winner.weighted_score:.3f}/10 using the supplied weights. "
        f"Its largest weighted contributions come from {strongest[0][0].replace('_', ' ')} "
        f"({strongest[0][1]:.2f}) and {strongest[1][0].replace('_', ' ')} ({strongest[1][1]:.2f}). "
        f"This recommendation is specific to {project.name}: {project.concurrent_users:,} concurrent users, "
        f"a {project.team_size}-person team, {project.data_sensitivity.lower()} data sensitivity, and an "
        f"INR {project.budget:,.0f} monthly budget. It is a decision aid, not an automatic preference for "
        f"any architecture pattern; changing weights or requirements can change the winner."
    )
    return ComparisonResponse(
        project_id=project.id,
        weights=weights,
        results=ranked,
        recommended_architecture_id=winner.architecture_id,
        explanation=explanation,
    )
