from __future__ import annotations

import re

from ..models import Project
from ..schemas import RequirementsAnalysis


def _unique(items: list[str]) -> list[str]:
    return list(dict.fromkeys(item.strip() for item in items if item and item.strip()))


def _description_requirements(project: Project) -> list[str]:
    text = project.description.lower()
    capabilities = {
        "product": "Product catalog browsing and search",
        "cart": "Persistent shopping cart management",
        "payment": "Secure payment integration and reconciliation",
        "order": "Order placement, tracking, and management",
        "inventory": "Real-time inventory management",
        "admin": "Administrative dashboard and operational analytics",
        "auth": "User registration and secure authentication",
        "patient": "Patient records and consent-aware access",
        "appointment": "Appointment scheduling and notifications",
        "transaction": "Transaction processing and audit history",
        "course": "Course and learning content management",
        "quiz": "Assessments, quizzes, and progress tracking",
        "sensor": "Sensor ingestion and device management",
        "notification": "User notifications across appropriate channels",
        "report": "Reporting and data export",
        "upload": "Secure file upload and object storage",
    }
    return [value for keyword, value in capabilities.items() if keyword in text]


def analyze_requirements(project: Project) -> RequirementsAnalysis:
    """Deterministic, requirements-aware analysis used when no AI key is configured."""
    functional = _unique(list(project.functional_requirements) + _description_requirements(project))
    if not functional:
        clauses = re.split(r"[.;\n]", project.description)
        functional = _unique([clause for clause in clauses if len(clause.strip()) > 12])[:8]
    if not functional:
        functional = ["Core workflows described in the project brief require further decomposition"]

    non_functional = list(project.non_functional_requirements)
    inferred = [
        f"Support {project.concurrent_users:,} concurrent users and {project.daily_requests:,} daily requests",
        f"Meet the stated availability target of {project.availability}",
        f"Protect {project.data_sensitivity.lower()}-sensitivity data in transit and at rest",
        f"Remain operable within an illustrative monthly budget of INR {project.budget:,.0f}",
        f"Accommodate {project.growth.lower()} future growth without a disruptive redesign",
    ]
    non_functional = _unique(non_functional + inferred)

    constraints = [
        f"Development team size: {project.team_size}",
        f"Preferred cloud provider: {project.cloud_provider}",
        f"Deployment preference: {project.deployment_preference}",
        f"Preferred languages: {', '.join(project.preferred_languages) or 'no preference stated'}",
        f"Data sensitivity: {project.data_sensitivity}",
    ]
    missing: list[str] = []
    questions: list[str] = []
    if not project.functional_requirements:
        missing.append("Acceptance criteria and priorities for individual functional workflows")
        questions.append("Which three user journeys are essential for the first production release?")
    if not project.non_functional_requirements:
        missing.append("Explicit latency, recovery-point, and recovery-time objectives")
        questions.append("What response-time and disaster-recovery targets must the system meet?")
    if project.data_sensitivity.lower() in {"high", "critical"}:
        missing.append("Applicable regulatory, retention, residency, and audit requirements")
        questions.append("Which regulations and data-residency obligations apply to sensitive records?")
    if "payment" in project.description.lower() or project.domain.lower() == "fintech":
        missing.append("Payment provider, reconciliation, refund, and compliance scope")
        questions.append("Which payment provider and compliance boundaries should the design assume?")
    if not missing:
        missing.append("Detailed peak-load distribution and disaster-recovery objectives")
        questions.append("What fraction of daily traffic occurs during the busiest hour?")

    risks = [
        f"Peak demand may exceed averages implied by {project.daily_requests:,} daily requests",
        "Third-party integrations can reduce availability unless timeouts and retries are bounded",
    ]
    if project.team_size <= 3:
        risks.append("A small team may struggle with excessive operational or distributed-system complexity")
    if project.data_sensitivity.lower() in {"high", "critical"}:
        risks.append("Sensitive data increases the impact of access-control, audit, and key-management failures")
    if project.budget < 25_000:
        risks.append("The stated budget constrains redundant managed infrastructure and always-on capacity")

    summary = (
        f"{project.name} is a {project.domain} system for {project.target_users}. It needs "
        f"{len(functional)} identified functional capability groups, {project.concurrent_users:,}-user "
        f"concurrency, {project.availability} availability, and a deployment aligned with "
        f"{project.cloud_provider}. Architecture selection should balance the team's {project.team_size}-person "
        f"delivery capacity, {project.growth.lower()} growth, and INR {project.budget:,.0f} monthly budget."
    )
    return RequirementsAnalysis(
        functional_requirements=functional,
        non_functional_requirements=non_functional,
        constraints=constraints,
        missing_requirements=_unique(missing),
        risks=risks,
        questions=_unique(questions),
        summary=summary,
        analysis_mode="demo",
    )
