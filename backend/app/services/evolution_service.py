from __future__ import annotations

from ..models import Architecture, Project
from ..schemas import EvolutionAnalysis, EvolutionStage


def plan_evolution(architecture: Architecture, project: Project) -> EvolutionAnalysis:
    pattern = architecture.pattern.lower()
    base = architecture.monthly_infrastructure_cost
    starting_name = architecture.name
    if "microservice" in pattern:
        starting_name = "Focused Domain-Service Baseline"
    elif "event" in pattern:
        starting_name = "Command API with Durable Events"
    elif "serverless" in pattern:
        starting_name = "Managed Function Baseline"
    stages = [
        EvolutionStage(
            stage=1, name=starting_name,
            description=f"Production baseline for {project.name} at {project.concurrent_users:,} concurrent users with explicit recovery and security controls.",
            changes=["Deploy the recommended domain boundaries and managed backups", "Instrument user journeys and set baseline latency/error budgets"],
            reasons=["Meet current needs without paying for unproven future scale", "Establish measurements that will govern later decomposition"],
            new_components=["CI/CD and health-gated deployment", "Central logs, metrics, traces, and alerts"],
            benefits=["Controlled operational baseline", "Measured scaling and reliability decisions"], complexity=architecture.complexity, cost_impact=0.0,
        ),
        EvolutionStage(
            stage=2, name="Optimized Modular Runtime with Cache and Queues",
            description="Reduce interactive pressure while retaining simple domain ownership and transactional workflows.",
            changes=["Introduce measured read-through caching and explicit invalidation ownership", "Move exports, notifications, and slow integration work to durable background jobs", "Add read replicas for suitable query paths"],
            reasons=[f"Absorb growth toward {project.concurrent_users * 5:,} concurrent users", "Protect request latency from variable third-party and reporting workloads"],
            new_components=["Redis-compatible cache", "Durable job queue and worker autoscaling", "PostgreSQL read replica when measurements justify it"],
            benefits=["Higher read throughput", "More stable tail latency", "Improved burst absorption"], complexity="Medium", cost_impact=round(base * 0.22, 2),
        ),
        EvolutionStage(
            stage=3, name="Selectively Distributed High-Change Domains",
            description="Extract only domains with demonstrated independent scaling, release, or isolation needs rather than distributing every module.",
            changes=["Extract the highest-pressure domain behind a versioned API", "Adopt transactional outbox, idempotent consumers, and explicit consistency boundaries", "Introduce API gateway policies and per-component service levels"],
            reasons=["Independent scaling or team autonomy now has measured value", "Reduce blast radius for the most volatile or resource-intensive workflows"],
            new_components=["API gateway", "Event bus and dead-letter queues", "Independent domain datastore/schema", "Distributed tracing context propagation"],
            benefits=["Targeted elasticity", "Independent deployments where valuable", "Improved fault isolation"], complexity="High", cost_impact=round(base * 0.68, 2),
        ),
        EvolutionStage(
            stage=4, name="Resilient Elastic Platform",
            description=f"A measured distributed architecture supporting {project.concurrent_users * 10:,} concurrent users with autoscaling and practiced recovery.",
            changes=["Partition only proven hot data/event paths", "Add multi-zone failover, load shedding, and automated capacity policies", "Run game days for dependency, zone, restore, and replay failures"],
            reasons=[f"Sustain the project's {project.growth.lower()} growth outlook and {project.availability} availability target", "Control cascading failures and recovery time at high scale"],
            new_components=["Multi-zone autoscaling policies", "Service-level/error-budget automation", "Chaos and recovery test tooling", "Data lifecycle and archival tier"],
            benefits=["Higher resilience under component failure", "Controlled scale economics", "Evidence-based recovery readiness"], complexity="Very High", cost_impact=round(base * 1.45, 2),
        ),
    ]
    summary = (
        f"Evolve {architecture.name} only when measured demand or organizational needs justify each step. "
        f"The roadmap reaches ten times the stated concurrency for {project.name}; cost_impact is the illustrative "
        "increase over the current monthly baseline at each stage, not a cumulative cloud quote. Later distribution "
        "is optional, not an assumption that microservices are inherently superior."
    )
    return EvolutionAnalysis(architecture_id=architecture.id, stages=stages, summary=summary)
