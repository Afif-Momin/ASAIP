from __future__ import annotations

from ..models import Project
from ..schemas import ArchitectureDraft, Diagram, DiagramEdge, DiagramNode, TechnologyStack


def _stack(project: Project, pattern: str) -> TechnologyStack:
    languages = project.preferred_languages or ["Python"]
    primary = languages[0].lower()
    if "java" in primary and "javascript" not in primary:
        backend = ["Java 21", "Spring Boot", "Spring Data"]
    elif primary in {"c#", "csharp", ".net"}:
        backend = ["C#", ".NET 9", "Entity Framework Core"]
    elif primary in {"javascript", "typescript", "node", "node.js"}:
        backend = ["TypeScript", "Node.js", "NestJS"]
    elif primary == "go":
        backend = ["Go", "Chi", "sqlc"]
    else:
        backend = ["Python 3.13", "FastAPI", "SQLAlchemy 2"]
    if "serverless" in pattern:
        backend += ["Managed functions", "Event triggers"]
    elif "microservice" in pattern:
        backend += ["Independent domain services", "OpenTelemetry"]
    else:
        backend += ["Explicit domain modules", "Transactional application services"]
    deployment = [project.cloud_provider, "Docker", "GitHub Actions CI/CD", "Infrastructure as Code"]
    if "serverless" in pattern:
        deployment = [project.cloud_provider, "Managed functions", "Managed API ingress", "CI/CD"]
    return TechnologyStack(
        frontend=["React", "TypeScript", "Vite", "Accessible component library"],
        backend=backend,
        database=["PostgreSQL", "Redis for ephemeral caching", "Object storage for exports and media"],
        api=(
            ["REST/JSON", "OpenAPI", "Async events via managed queue"]
            if "event" in pattern or "microservice" in pattern
            else ["REST/JSON", "OpenAPI", "Background jobs for non-interactive work"]
        ),
        authentication=["OIDC/OAuth 2.0", "Short-lived access tokens", "Role-based authorization", "MFA for administrators"],
        deployment=deployment,
    )


def _domain_nodes(project: Project) -> tuple[str, str, str]:
    domain = project.domain.lower()
    if "commerce" in domain:
        return "Catalog & Search", "Cart & Orders", "Payments & Inventory"
    if "health" in domain:
        return "Patient Records", "Appointments & Care", "Consent & Audit"
    if "fintech" in domain:
        return "Accounts & Ledger", "Transactions", "Risk & Compliance"
    if "education" in domain:
        return "Courses & Content", "Enrolment & Progress", "Assessments"
    if "iot" in domain:
        return "Device Registry", "Telemetry Ingestion", "Rules & Alerts"
    if "ai" in domain or "ml" in domain:
        return "Datasets & Features", "Model Inference", "Evaluation & Monitoring"
    return f"{project.domain} Core", "Primary Workflows", "Administration & Reporting"


def _node(node_id: str, label: str, kind: str, description: str, x: float, y: float) -> DiagramNode:
    return DiagramNode(id=node_id, label=label, type=kind, description=description, position={"x": x, "y": y})


def _edge(edge_id: str, source: str, target: str, label: str | None = None) -> DiagramEdge:
    return DiagramEdge(id=edge_id, source=source, target=target, label=label)


def _diagram(project: Project, pattern: str) -> Diagram:
    first, second, third = _domain_nodes(project)
    nodes = [
        _node("client", "Web & Mobile Clients", "client", f"Interfaces used by {project.target_users}.", 40, 180),
        _node("frontend", "React Frontend", "frontend", "Accessible browser application with server-state caching and protected routes.", 250, 180),
        _node("observability", "Logs, Metrics & Traces", "monitoring", "Central telemetry, alerts, audit trails, and service-level monitoring.", 760, 360),
        _node("database", "PostgreSQL", "database", "Encrypted relational system of record with backups and point-in-time recovery.", 1030, 180),
    ]
    edges = [
        _edge("e-client-web", "client", "frontend", "HTTPS"),
        _edge("e-observability", "observability", "database", "health telemetry"),
    ]
    if "modular" in pattern:
        nodes += [
            _node("ingress", "Load Balancer & WAF", "gateway", "TLS termination, request limits, and health-based routing.", 450, 180),
            _node("modules", "Modular Application", "backend", f"One deployable with enforced {first}, {second}, and {third} module boundaries.", 670, 180),
            _node("cache", "Redis Cache & Jobs", "cache", "Short-lived catalog/session cache and reliable background-job coordination.", 1030, 60),
        ]
        edges += [
            _edge("e-web-ingress", "frontend", "ingress", "API requests"),
            _edge("e-ingress-modules", "ingress", "modules"),
            _edge("e-modules-db", "modules", "database", "SQL transactions"),
            _edge("e-modules-cache", "modules", "cache", "cache/jobs"),
            _edge("e-modules-obs", "modules", "observability", "telemetry"),
        ]
    elif "microservice" in pattern:
        nodes += [
            _node("gateway", "API Gateway & WAF", "gateway", "Authentication enforcement, quotas, routing, and correlation IDs.", 440, 180),
            _node("service-a", first, "service", "Independently deployable domain service owning its public contract.", 650, 40),
            _node("service-b", second, "service", "Transactional workflow service with isolated scaling and failure policies.", 650, 180),
            _node("service-c", third, "service", "Integration-focused service with idempotency and third-party isolation.", 650, 320),
            _node("queue", "Event Bus", "queue", "Durable domain events for asynchronous integration and outbox delivery.", 850, 300),
            _node("cache", "Distributed Cache", "cache", "Reusable read-through cache with explicit invalidation ownership.", 1030, 40),
        ]
        edges += [
            _edge("e-web-gateway", "frontend", "gateway", "REST"),
            _edge("e-gateway-a", "gateway", "service-a"),
            _edge("e-gateway-b", "gateway", "service-b"),
            _edge("e-gateway-c", "gateway", "service-c"),
            _edge("e-a-db", "service-a", "database", "owned schema"),
            _edge("e-b-queue", "service-b", "queue", "domain events"),
            _edge("e-queue-c", "queue", "service-c", "async commands"),
            _edge("e-a-cache", "service-a", "cache"),
            _edge("e-services-obs", "service-b", "observability", "traces"),
        ]
    elif "serverless" in pattern:
        nodes += [
            _node("gateway", "Managed API Gateway", "gateway", "Managed request validation, throttling, JWT verification, and function routes.", 440, 180),
            _node("function-a", f"{first} Functions", "function", "On-demand handlers for read and query workloads.", 650, 60),
            _node("function-b", f"{second} Functions", "function", "Short-lived transactional handlers with concurrency controls.", 650, 190),
            _node("queue", "Managed Queue & Scheduler", "queue", "Buffered asynchronous jobs, retries, and scheduled processing.", 850, 300),
            _node("storage", "Object Storage & CDN", "storage", "Static content, media, report artefacts, and edge delivery.", 1030, 330),
        ]
        edges += [
            _edge("e-web-gateway", "frontend", "gateway", "HTTPS/API"),
            _edge("e-gateway-a", "gateway", "function-a"),
            _edge("e-gateway-b", "gateway", "function-b"),
            _edge("e-a-db", "function-a", "database", "pooled SQL"),
            _edge("e-b-queue", "function-b", "queue", "async work"),
            _edge("e-queue-third", "queue", "function-b", third),
            _edge("e-b-storage", "function-b", "storage", "artefacts"),
            _edge("e-fn-obs", "function-a", "observability", "managed telemetry"),
        ]
    elif "event" in pattern:
        nodes += [
            _node("gateway", "API Ingress", "gateway", "Synchronous command/query endpoint with authentication and backpressure.", 440, 180),
            _node("command", f"{second} Command API", "backend", "Validates writes and atomically records events using an outbox.", 640, 180),
            _node("stream", "Durable Event Stream", "queue", "Ordered domain events with retention, replay controls, and consumer groups.", 830, 180),
            _node("worker-a", first, "worker", "Builds optimized read models and search projections.", 1030, 40),
            _node("worker-b", third, "worker", "Handles integration side effects idempotently.", 1030, 310),
            _node("read-db", "Read Projections", "database", "Query-optimized eventually consistent views.", 1250, 40),
        ]
        edges += [
            _edge("e-web-gateway", "frontend", "gateway"),
            _edge("e-gateway-command", "gateway", "command", "commands"),
            _edge("e-command-db", "command", "database", "transaction + outbox"),
            _edge("e-command-stream", "command", "stream", "publish"),
            _edge("e-stream-a", "stream", "worker-a", "consume"),
            _edge("e-stream-b", "stream", "worker-b", "consume"),
            _edge("e-a-read", "worker-a", "read-db", "project"),
            _edge("e-stream-obs", "stream", "observability", "lag metrics"),
        ]
    elif "layered" in pattern:
        nodes += [
            _node("controller", "API Controllers", "backend", "Transport validation and OpenAPI endpoints.", 470, 180),
            _node("service", "Application Services", "backend", f"Use-case coordination for {first} and {second}.", 680, 180),
            _node("repository", "Domain & Repositories", "backend", f"Business rules and persistence adapters including {third}.", 880, 180),
        ]
        edges += [
            _edge("e-web-controller", "frontend", "controller"),
            _edge("e-controller-service", "controller", "service"),
            _edge("e-service-repo", "service", "repository"),
            _edge("e-repo-db", "repository", "database"),
            _edge("e-service-obs", "service", "observability"),
        ]
    else:
        nodes += [
            _node("app", "Single Application", "backend", f"Cohesive application covering {first}, {second}, and {third}.", 560, 180),
            _node("worker", "Background Worker", "worker", "Scheduled and asynchronous work using the same released codebase.", 780, 50),
        ]
        edges += [
            _edge("e-web-app", "frontend", "app", "REST"),
            _edge("e-app-db", "app", "database"),
            _edge("e-app-worker", "app", "worker", "jobs"),
            _edge("e-worker-db", "worker", "database"),
            _edge("e-app-obs", "app", "observability"),
        ]
    return Diagram(nodes=nodes, edges=edges)


def _draft(project: Project, pattern: str) -> ArchitectureDraft:
    domain = project.domain
    load = f"{project.concurrent_users:,} concurrent users"
    common_use = [f"{domain} workloads serving {project.target_users}", f"Systems expecting {project.growth.lower()} growth"]
    definitions: dict[str, dict] = {
        "modular monolith": {
            "name": f"{domain} Modular Core",
            "description": f"A single deployable application with enforced domain boundaries for {project.name}, backed by PostgreSQL, background jobs, and targeted caching.",
            "components": ["Cloud load balancer and WAF", "Container application instances", "PostgreSQL with PITR", "Redis cache and job coordination", "Object storage", "Central observability"],
            "scale": f"Scale stateless application instances horizontally behind a load balancer for {load}; cache hot reads, move slow work to jobs, and add read replicas only after measurement.",
            "maintain": "Strong module ownership and dependency rules preserve change isolation without distributed transactions. Contract tests protect module boundaries and enable later extraction when justified.",
            "advantages": ["Simple transactional consistency across early workflows", "Low operational overhead for the stated team", "Clear module seams support future evolution", "Fast local development and end-to-end debugging"],
            "disadvantages": ["Modules share deployment and failure domains", "Independent scaling of one hot workflow is limited"],
            "complexity": "Medium",
            "initial": 1_250_000 + project.team_size * 65_000,
            "monthly": 38_000 + min(project.concurrent_users / 1000, 20) * 2_200,
            "uses": common_use + ["Teams that value clear boundaries and low operational complexity"],
            "tradeoffs": ["Deployment simplicity is traded for coarse-grained scaling", "A shared database preserves consistency but can become a contention point"],
            "suitability": f"Well suited to a {project.team_size}-person team because it provides explicit domain boundaries and {project.availability} availability without requiring a service mesh or distributed operations on day one.",
        },
        "microservices": {
            "name": f"{domain} Independent Domain Services",
            "description": f"Independently deployable domain services for {project.name}, with API ingress, owned data boundaries, asynchronous events, and centralized telemetry.",
            "components": ["API gateway and WAF", "Independent domain containers", "Service-owned PostgreSQL schemas", "Event bus and transactional outbox", "Distributed cache", "Service discovery and autoscaling", "OpenTelemetry observability"],
            "scale": f"Scale each domain service independently using CPU, concurrency, and event-lag signals for {load}; partition hot event topics and isolate bulkheads around third-party calls.",
            "maintain": "Service ownership enables independent releases but requires contract versioning, integration testing, disciplined data ownership, and mature platform automation.",
            "advantages": ["Independent scaling and deployment for high-change domains", "Failure isolation through service bulkheads", "Technology choices can evolve per service", "Supports multiple autonomous teams"],
            "disadvantages": ["Highest operational and testing complexity", "Distributed tracing and eventual consistency add cognitive load", "More baseline infrastructure cost"],
            "complexity": "Very High",
            "initial": 2_400_000 + project.team_size * 100_000,
            "monthly": 105_000 + min(project.concurrent_users / 1000, 20) * 4_500,
            "uses": common_use + ["Organizations with mature DevOps and independently owned domains"],
            "tradeoffs": ["Independent deployability is traded for operational and testing burden", "Scalability improves while simple ACID workflows become distributed Sagas"],
            "suitability": f"Appropriate only where independent domain scaling or team autonomy justifies its cost; it is not automatically preferred for {project.name}, especially with a {project.team_size}-person team.",
        },
        "serverless": {
            "name": f"{domain} Elastic Serverless",
            "description": f"Managed API ingress, event-triggered functions, queues, and serverless-friendly data access for variable-demand {project.name} workloads.",
            "components": ["Managed API gateway", "On-demand function compute", "PostgreSQL with connection pooling", "Managed queues and scheduler", "Object storage and CDN", "Managed monitoring and secrets"],
            "scale": f"Use managed function concurrency and queue absorption for bursts above {load}; reserve concurrency for critical paths, pool database connections, and pre-warm only measured cold-start-sensitive routes.",
            "maintain": "Small handlers and managed infrastructure reduce server maintenance, while shared domain libraries and integration tests prevent fragmented function logic.",
            "advantages": ["Automatic scaling for variable traffic", "Minimal server administration", "Usage-based compute can be efficient at low utilization", "Managed queues absorb bursts"],
            "disadvantages": ["Cold starts and execution limits need workload validation", "Sustained high traffic can become expensive", "Vendor-specific triggers increase lock-in"],
            "complexity": "Medium-High",
            "initial": 1_450_000 + project.team_size * 75_000,
            "monthly": 32_000 + min(project.daily_requests / 100_000, 100) * 850,
            "uses": common_use + ["Bursty APIs, scheduled processing, and small platform teams"],
            "tradeoffs": ["Reduced operations is traded for provider coupling and runtime constraints", "Low-idle costs can become high sustained-throughput costs"],
            "suitability": f"Useful for {project.name} when traffic is variable and managed scaling matters; database connection ceilings and {project.availability} latency behavior must be load-tested.",
        },
        "event-driven": {
            "name": f"{domain} Reactive Event Platform",
            "description": f"A command API and durable event stream for {project.name}, with idempotent workers and optimized read projections for high-throughput workflows.",
            "components": ["Authenticated API ingress", "Transactional command API", "Durable event stream", "Idempotent consumer workers", "PostgreSQL write store", "Read projection store", "Consumer-lag monitoring"],
            "scale": f"Scale consumers by event lag and partition count as demand grows beyond {load}; apply backpressure, replayable events, and separate query projections.",
            "maintain": "Explicit event contracts and idempotency make flows auditable, but schema evolution, replay testing, and eventual consistency require discipline.",
            "advantages": ["Excellent burst absorption and asynchronous scaling", "Auditable domain event history", "Consumers can evolve independently", "Slow integrations do not block interactive requests"],
            "disadvantages": ["Eventual consistency complicates user experience", "Event schema and replay governance are essential", "Debugging flows requires strong tracing"],
            "complexity": "High",
            "initial": 1_950_000 + project.team_size * 90_000,
            "monthly": 72_000 + min(project.daily_requests / 100_000, 100) * 1_200,
            "uses": common_use + ["High-throughput workflows with asynchronous integration and audit needs"],
            "tradeoffs": ["Throughput and resilience are traded for eventual consistency", "Flexible consumers add schema-governance responsibility"],
            "suitability": f"Fits {project.name} if bursts and asynchronous workflows dominate; for simple CRUD it introduces more machinery than the requirements justify.",
        },
        "layered": {
            "name": f"{domain} Layered Application",
            "description": f"A conventional controller-service-repository design for {project.name}, optimized for familiar development and straightforward deployment.",
            "components": ["Reverse proxy", "Application server", "PostgreSQL", "Background scheduler", "Object storage", "Basic centralized monitoring"],
            "scale": f"Add application instances and optimize queries for {load}; use connection pooling, targeted read caching, and vertical database scaling before distribution.",
            "maintain": "Familiar layers ease onboarding, though strict dependency rules are needed to prevent business logic accumulating in controllers or repositories.",
            "advantages": ["Familiar structure and gentle learning curve", "Simple deployment and transactions", "Efficient for stable, well-understood workflows"],
            "disadvantages": ["Layers alone do not enforce domain ownership", "Coarse scaling and shared release coupling"],
            "complexity": "Low-Medium",
            "initial": 950_000 + project.team_size * 55_000,
            "monthly": 29_000 + min(project.concurrent_users / 1000, 20) * 1_800,
            "uses": common_use + ["Stable business applications with modest scale and conventional teams"],
            "tradeoffs": ["Ease of delivery is traded for weaker domain isolation", "Simple infrastructure limits independent scaling"],
            "suitability": f"A pragmatic choice for {project.name} when requirements are stable and the team values conventional development over elastic domain scaling.",
        },
        "monolith": {
            "name": f"{domain} Lean Monolith",
            "description": f"A cohesive single application and relational datastore for {project.name}, minimizing moving parts for rapid validation.",
            "components": ["Single application runtime", "PostgreSQL", "Background worker", "Object storage", "Uptime and log monitoring"],
            "scale": f"Scale vertically first and add stateless replicas for {load}; tune queries and extract background work before considering broader distribution.",
            "maintain": "A small codebase is easy to navigate initially, but explicit internal boundaries and tests are required to prevent coupling as features grow.",
            "advantages": ["Lowest initial delivery and operating cost", "Simple transactions and debugging", "Minimal infrastructure and deployment overhead"],
            "disadvantages": ["Scaling and releases are coarse-grained", "Growing coupling can reduce maintainability", "Single application failure domain"],
            "complexity": "Low",
            "initial": 700_000 + project.team_size * 45_000,
            "monthly": 20_000 + min(project.concurrent_users / 1000, 20) * 1_500,
            "uses": common_use + ["Early validation, prototypes, and modest stable workloads"],
            "tradeoffs": ["Fast delivery is traded for weaker long-term isolation", "Low cost limits resilience and elastic scaling options"],
            "suitability": f"Useful for an early release of {project.name}, but {project.growth.lower()} growth and {project.availability} availability may require the supplied evolution roadmap.",
        },
    }
    data = definitions[pattern]
    sensitivity = project.data_sensitivity.lower()
    security = (
        "Use OIDC with short-lived tokens, deny-by-default RBAC, MFA for privileged users, TLS, envelope encryption, "
        "managed secrets, WAF/rate limits, immutable audit logs, and tested backup restoration. "
        + ("Apply field-level minimization, key rotation, residency controls, and enhanced audit alerting for sensitive records." if sensitivity in {"high", "critical"} else "Classify data and apply retention and least-privilege policies per domain.")
    )
    return ArchitectureDraft(
        name=data["name"], description=data["description"], pattern=pattern,
        technology_stack=_stack(project, pattern), infrastructure_components=data["components"],
        scalability_strategy=data["scale"], security_strategy=security,
        maintainability_assessment=data["maintain"], advantages=data["advantages"],
        disadvantages=data["disadvantages"], complexity=data["complexity"],
        initial_development_cost=float(data["initial"]), monthly_infrastructure_cost=round(float(data["monthly"]), 2),
        recommended_use_cases=data["uses"], tradeoffs=data["tradeoffs"],
        suitability_explanation=data["suitability"], diagram=_diagram(project, pattern),
    )


def generate_fallback_architectures(project: Project) -> list[ArchitectureDraft]:
    """Select three appropriate, genuinely different alternatives using project constraints."""
    high_load = project.concurrent_users >= 5000 or project.daily_requests >= 2_000_000
    small_team = project.team_size <= 4
    rapid_growth = any(word in project.growth.lower() for word in ("high", "rapid", "aggressive", "10x"))
    domain = project.domain.lower()
    priorities = {
        "modular monolith": 72 + (12 if small_team else 4),
        "serverless": 55 + (14 if rapid_growth else 3) + (5 if small_team else 0),
        "event-driven": 51 + (17 if high_load else 0) + (15 if domain in {"iot", "fintech"} else 0),
        "microservices": 39 + (17 if high_load else 0) + (24 if project.team_size >= 8 else -8),
        "layered": 50 + (8 if project.team_size <= 6 else 0) - (8 if rapid_growth else 0),
        "monolith": 43 + (16 if project.concurrent_users < 1000 else -12) + (8 if project.budget < 25_000 else 0),
    }
    if "serverless" in project.deployment_preference.lower():
        priorities["serverless"] += 25
    if "on-prem" in project.deployment_preference.lower():
        priorities["serverless"] -= 30
        priorities["modular monolith"] += 5
    selected = sorted(priorities, key=priorities.get, reverse=True)[:3]
    return [_draft(project, pattern) for pattern in selected]
