from __future__ import annotations

from ..models import Architecture, Project
from ..schemas import ScalabilityAnalysis, ScalabilityScenario


def analyze_scalability(architecture: Architecture, project: Project) -> ScalabilityAnalysis:
    pattern = architecture.pattern.lower()
    base_rps = max(1.0, project.daily_requests / 86_400 * 4)  # illustrative four-times-average peak
    scenarios: list[ScalabilityScenario] = []
    for name, multiplier in (("Current Load", 1), ("5× Growth", 5), ("10× Growth", 10)):
        changes: list[str] = []
        bottlenecks: list[str] = []
        risks: list[str] = []
        if multiplier == 1:
            changes = ["Establish latency, saturation, error-rate, and database baseline dashboards", "Enable health checks, alerts, and automated backups"]
        elif "serverless" in pattern:
            changes = [f"Raise managed concurrency in measured steps toward {multiplier}× demand", "Add queue-based backpressure and database connection-pool ceilings", "Use CDN caching for eligible reads and static assets"]
            bottlenecks = ["Database connection ceiling", "Downstream provider quotas", "Cold starts on infrequent critical routes"]
            risks = ["Invocation costs may grow linearly under sustained load", "Uncontrolled retries can amplify traffic"]
        elif "microservice" in pattern or "event" in pattern:
            changes = [f"Autoscale hot services/consumers independently for {multiplier}× demand", "Partition event streams by a stable domain key and monitor consumer lag", "Add read replicas and shard only measured hot data paths"]
            bottlenecks = ["Hot event partitions", "Cross-service data contention", "Third-party integration throughput"]
            risks = ["Cascading retries without budgets", "Event ordering and replay incidents", "Observability cardinality and operating cost"]
        else:
            changes = [f"Scale stateless application replicas horizontally toward {multiplier}× demand", "Move expensive jobs off request workers and cache measured hot reads", "Add PostgreSQL read replicas and tune connection pools before considering partitioning"]
            bottlenecks = ["Shared PostgreSQL write capacity", "Coarse application-level scaling", "Cache invalidation on shared domain data"]
            risks = ["A deployment or schema migration affects all modules", "Headroom diminishes if growth remains sustained"]
        if multiplier == 1:
            bottlenecks = ["Unmeasured peak database queries", "External integration latency"]
            risks = ["Average-load tests may hide burst behavior", "A single unhealthy dependency can increase tail latency"]
        if "serverless" in pattern:
            strategy = "Concurrency limits, queue absorption, managed autoscaling, and strict database connection governance"
        elif "event" in pattern or "microservice" in pattern:
            strategy = "Signal-driven independent autoscaling, load shedding, partitioning, and backpressure"
        else:
            strategy = "Horizontal stateless scaling with cache/offload first, followed by measured database read scaling"
        cost_factor = 1 + (multiplier - 1) * (0.48 if "serverless" in pattern else 0.58 if "microservice" in pattern or "event" in pattern else 0.66)
        scenarios.append(
            ScalabilityScenario(
                name=name,
                expected_users=project.concurrent_users * multiplier,
                requests_per_second=round(base_rps * multiplier, 2),
                infrastructure_changes=changes,
                bottlenecks=bottlenecks,
                scaling_strategy=strategy,
                estimated_monthly_cost=round(architecture.monthly_infrastructure_cost * cost_factor, 2),
                performance_risks=risks,
            )
        )
    explanation = (
        f"The scenarios use four times the average request rate as an illustrative peak and scale {project.name} "
        f"from {project.concurrent_users:,} to {project.concurrent_users * 10:,} concurrent users. Costs are deterministic "
        "capacity-planning estimates, not provider quotes. Validate scaling triggers with representative load tests and "
        "preserve correctness, backpressure, and recovery objectives at every stage."
    )
    return ScalabilityAnalysis(architecture_id=architecture.id, scenarios=scenarios, explanation=explanation)
