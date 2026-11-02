from __future__ import annotations

from datetime import datetime, timezone

from ..models import Architecture, Project
from ..schemas import CriticIssue, CriticReview

SEVERITY_WEIGHT = {"Critical": 30, "High": 20, "Medium": 11, "Low": 5}


def _issue(
    title: str, severity: str, component: str, explanation: str, why: str, fix: str, improvement: str
) -> CriticIssue:
    return CriticIssue(
        title=title, severity=severity, affected_component=component, explanation=explanation,
        why_it_matters=why, recommended_fix=fix, expected_improvement=improvement,
    )


def review_architecture(architecture: Architecture, project: Project) -> CriticReview:
    """Fresh deterministic design review; no cached findings or AI-generated claims."""
    pattern = architecture.pattern.lower()
    issues: list[CriticIssue] = []
    if "microservice" in pattern or "event" in pattern:
        issues.append(_issue(
            "Distributed consistency and retry hazards", "High", "Service and event workflows",
            "Cross-component writes and asynchronous retries can produce partial completion or duplicate side effects without explicit idempotency and Saga boundaries.",
            "Users may see inconsistent state and operational recovery becomes difficult during partial outages.",
            "Define transactional outbox/inbox handling, idempotency keys, retry budgets, dead-letter queues, and compensation tests.",
            "Predictable recovery, fewer duplicates, and clearer end-to-end failure behavior.",
        ))
        issues.append(_issue(
            "Operational complexity may exceed team capacity", "High" if project.team_size <= 4 else "Medium", "Platform operations",
            f"The design requires distributed deployment, tracing, schema governance, and incident response with a {project.team_size}-person team.",
            "Undifferentiated platform work can delay domain delivery and increase mean time to recovery.",
            "Consolidate low-change components, standardize deployment templates, automate service-level alerts, and assign explicit ownership.",
            "Lower operational load and safer, more consistent releases.",
        ))
    elif "serverless" in pattern:
        issues.append(_issue(
            "Database connection exhaustion under concurrency", "High", "Functions and PostgreSQL",
            "Independent function instances can each open database connections during bursts, exceeding database limits even when compute scales successfully.",
            "Connection saturation causes timeouts and retry amplification on critical requests.",
            "Use a serverless-compatible pooled proxy, cap function concurrency, set short timeouts, and load-test peak connection behavior.",
            "Bounded database pressure and more stable tail latency during bursts.",
        ))
        issues.append(_issue(
            "Cold-start and provider coupling", "Medium", "Managed functions and triggers",
            "Latency-sensitive routes may encounter cold starts, while provider-specific events and IAM models reduce portability.",
            "Tail latency and migration cost can violate user expectations or future deployment constraints.",
            "Measure cold paths, keep deployment packages small, isolate provider adapters, and reserve warm capacity only for proven critical routes.",
            "More predictable latency and reduced migration friction without unnecessary always-on cost.",
        ))
    else:
        issues.append(_issue(
            "Shared database is a scaling and failure concentration", "High" if project.concurrent_users >= 5000 else "Medium", "PostgreSQL",
            f"All major workflows share a write database while supporting up to {project.concurrent_users:,} concurrent users and future growth.",
            "Lock contention, slow queries, or primary failure can affect every domain simultaneously.",
            "Add query budgets, connection pooling, tested PITR, a monitored standby, and read replicas only for suitable queries; define write-scaling thresholds.",
            "Improved recovery and query headroom with measured rather than premature distribution.",
        ))
        issues.append(_issue(
            "Shared release and failure domain", "Medium", "Application deployment",
            "A faulty module or deployment can affect unrelated workflows because components share runtime and release boundaries.",
            "Blast radius grows with traffic and feature count even if internal module boundaries are clean.",
            "Use health-gated rolling/blue-green releases, bulkheads for external calls, module tests, and documented extraction triggers.",
            "Safer releases and a clear path to isolate only components that need it.",
        ))

    if project.data_sensitivity.lower() in {"high", "critical"}:
        issues.append(_issue(
            "Sensitive-data controls need verification", "High", "Data access and audit plane",
            f"The project declares {project.data_sensitivity} data sensitivity; transport encryption alone does not prove least privilege, retention, residency, or audit completeness.",
            "Access or retention failures can create regulatory exposure and a high-impact data breach.",
            "Threat-model sensitive flows, enforce deny-by-default authorization, centralize tamper-evident audit, rotate keys, and test restore/access procedures.",
            "Reduced breach blast radius and demonstrable control over regulated data.",
        ))
    else:
        issues.append(_issue(
            "Authorization and abuse controls require negative testing", "Medium", "API ingress and identity",
            "Authentication is specified, but object-level authorization, privilege boundaries, and rate-limit bypasses still need adversarial verification.",
            "A valid user token must not grant access to another tenant's records or unlimited expensive operations.",
            "Add object-level policy tests, privileged MFA, scoped tokens, per-identity quotas, and security regression tests.",
            "Lower likelihood of broken access control and request abuse.",
        ))

    if architecture.monthly_infrastructure_cost > project.budget > 0:
        issues.append(_issue(
            "Estimated baseline exceeds monthly budget", "High", "Cloud infrastructure",
            f"The baseline INR {architecture.monthly_infrastructure_cost:,.0f} estimate exceeds the INR {project.budget:,.0f} budget before growth and support costs.",
            "The design may be financially unsustainable or force unsafe reductions in backup and observability coverage.",
            "Reduce idle redundancy outside production, consolidate components, set autoscaling ceilings, and renegotiate requirements or budget.",
            "A sustainable operating envelope without silently removing resilience controls.",
        ))
    else:
        issues.append(_issue(
            "Observability service levels are not yet measurable", "Low", "Logs, metrics, and traces",
            "Telemetry components are present, but architecture data does not define alert thresholds, ownership, or error-budget policy.",
            "Collecting telemetry without actionable service levels can prolong incidents and increase storage cost.",
            "Define user-centric SLIs, alert on symptoms, run incident drills, correlate traces, and set telemetry retention limits.",
            "Faster detection and diagnosis with controlled observability cost.",
        ))

    risk_score = min(100, sum(SEVERITY_WEIGHT[issue.severity] for issue in issues))
    highest = max((issue.severity for issue in issues), key=SEVERITY_WEIGHT.__getitem__)
    summary = (
        f"Deterministic fresh review found {len(issues)} actionable findings with a risk score of {risk_score}/100. "
        f"The most severe finding is {highest}. Prioritize correctness, recovery, and access control before adding capacity; "
        "the score reflects architecture risk, not the weighted suitability ranking."
    )
    return CriticReview(
        architecture_id=architecture.id, risk_score=risk_score, summary=summary, issues=issues,
        reviewed_at=datetime.now(timezone.utc), analysis_mode="demo",
    )
