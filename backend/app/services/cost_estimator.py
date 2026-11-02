from __future__ import annotations

from ..models import Architecture, Project
from ..schemas import CostAnalysis, CostBreakdownItem

DISCLAIMER = (
    "Illustrative estimates based on configurable pricing assumptions. Actual cloud costs may vary "
    "by region, usage, and provider pricing."
)

# PoC pricing reference: relative multipliers and component allocation, not live pricing.
PROVIDER_MULTIPLIERS = {"AWS": 1.0, "Azure": 1.04, "GCP": 0.96}
COMPONENT_WEIGHTS = {
    "Compute": 0.29,
    "Database": 0.20,
    "Storage": 0.06,
    "Networking": 0.08,
    "Load Balancer": 0.08,
    "Cache": 0.10,
    "API Gateway": 0.09,
    "Monitoring": 0.10,
}


def normalize_provider(provider: str | None, fallback: str = "AWS") -> str:
    value = (provider or fallback).strip().lower()
    aliases = {
        "aws": "AWS", "amazon web services": "AWS",
        "azure": "Azure", "microsoft azure": "Azure",
        "gcp": "GCP", "google cloud": "GCP", "google cloud platform": "GCP",
    }
    if value not in aliases:
        raise ValueError("provider must be AWS, Azure, GCP, Microsoft Azure, or Google Cloud Platform")
    return aliases[value]


def estimate_cost(
    architecture: Architecture, project: Project, provider: str | None = None
) -> CostAnalysis:
    selected = normalize_provider(provider, project.cloud_provider)
    multiplier = PROVIDER_MULTIPLIERS[selected]
    pattern = architecture.pattern.lower()
    architecture_factor = 1.0
    if "serverless" in pattern:
        architecture_factor = 0.9 if project.daily_requests < 2_000_000 else 1.25
    elif "microservice" in pattern:
        architecture_factor = 1.18
    elif "event" in pattern:
        architecture_factor = 1.10

    raw_components: list[CostBreakdownItem] = []
    for component, weight in COMPONENT_WEIGHTS.items():
        amount = architecture.monthly_infrastructure_cost * multiplier * architecture_factor * weight
        detail = (
            f"Configurable {selected} reference allocation for {component.lower()} at the projected load; "
            "usage, region, support, tax, and commitment discounts are excluded."
        )
        if component == "API Gateway" and "serverless" not in pattern and "microservice" not in pattern:
            detail = "Ingress/API routing allowance; a modular deployment may use a simpler reverse proxy."
        if component == "Cache" and not any("cache" in item.lower() or "redis" in item.lower() for item in architecture.infrastructure_components):
            amount *= 0.25
            detail = "Small reserved allowance; the proposed design does not require a dedicated cache initially."
        raw_components.append(
            CostBreakdownItem(component=component, monthly_cost=round(amount, 2), details=detail)
        )
    monthly = round(sum(item.monthly_cost for item in raw_components), 2)
    utilization = round((monthly / project.budget * 100), 2) if project.budget > 0 else 0.0

    suggestions = [
        "Right-size compute using measured CPU, memory, and request profiles before purchasing capacity",
        "Use provider budgets and alerts, lifecycle rules for storage, and separate non-production environments",
    ]
    if "microservice" in pattern:
        suggestions.append("Consolidate low-traffic services until independent scaling justifies separate deployments")
    if "serverless" in pattern:
        suggestions.append("Model request duration and invocation volumes to avoid serverless cost surprises at sustained high load")
    if monthly > project.budget and project.budget > 0:
        suggestions.append("Reduce redundant non-production capacity and revisit the monthly budget before provisioning")
    else:
        suggestions.append("Consider commitment discounts only after a stable production baseline is observed")

    return CostAnalysis(
        architecture_id=architecture.id,
        provider=selected,
        setup_cost=round(architecture.initial_development_cost, 2),
        monthly_cost=monthly,
        annual_cost=round(monthly * 12, 2),
        breakdown=raw_components,
        budget_utilization=utilization,
        optimization_suggestions=suggestions,
        disclaimer=DISCLAIMER,
    )
