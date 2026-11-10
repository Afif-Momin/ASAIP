from __future__ import annotations

import re

from ..schemas import Diagram, DiagramEdge, DiagramNode

# Canonical component vocabulary. The frontend renders one icon/shape/colour per type.
CANONICAL_TYPES = [
    "client", "frontend", "cdn", "loadbalancer", "gateway", "service", "function",
    "worker", "database", "cache", "queue", "storage", "search", "monitoring",
    "secrets", "external",
]

# Synonyms ordered by specificity; normalization picks the longest matching keyword.
_TYPE_SYNONYMS: list[tuple[str, list[str]]] = [
    ("cdn", ["cdn", "cloudfront", "contentdelivery", "edgecache", "akamai", "fastly", "cloudcdn"]),
    ("loadbalancer", ["loadbalancer", "elb", "alb", "nlb", "reverseproxy", "proxy", "nginx", "haproxy", "trafficmanager", "ingresscontroller", "lb"]),
    ("gateway", ["apigateway", "gateway", "apiingress", "ingress", "waf", "firewall", "zuul", "kong", "envoy", "apisix"]),
    ("secrets", ["secretsmanager", "secret", "kms", "vault", "keymanagement", "iam", "identity", "authentication", "authorization", "auth", "cognito", "keycloak", "oauth", "security", "certificate", "cert", "pki"]),
    ("monitoring", ["observability", "monitoring", "monitor", "metrics", "logging", "logs", "tracing", "traces", "telemetry", "prometheus", "grafana", "cloudwatch", "datadog", "alerting", "alerts", "apm", "audit", "siem", "newrelic", "splunk", "opentelemetry"]),
    ("search", ["elasticsearch", "opensearch", "search", "solr", "algolia", "fulltext", "typesense", "meilisearch", "searchindex", "index"]),
    ("cache", ["cache", "redis", "memcached", "elasticache", "varnish", "caching", "sessionstore"]),
    ("queue", ["messagebroker", "eventstream", "eventbus", "queue", "broker", "kafka", "rabbitmq", "sqs", "sns", "pubsub", "topic", "nats", "activemq", "pulsar", "kinesis", "eventgrid", "servicebus", "stream", "events"]),
    ("storage", ["objectstorage", "storage", "blob", "s3", "bucket", "gcs", "azureblob", "filesystem", "efs", "media", "artifact", "artefact", "datalake", "minio", "filestore"]),
    ("database", ["postgresql", "postgres", "database", "mysql", "mariadb", "aurora", "rds", "nosql", "mongodb", "mongo", "dynamodb", "cassandra", "cockroach", "spanner", "firestore", "ledger", "datastore", "warehouse", "redshift", "bigquery", "snowflake", "sql", "db"]),
    ("function", ["azurefunction", "cloudfunction", "cloudrun", "function", "lambda", "serverless", "faas", "handler", "eventtrigger"]),
    ("worker", ["worker", "consumer", "subscriber", "background", "processor", "scheduler", "cron", "batch", "etl", "pipeline", "daemon", "job"]),
    ("frontend", ["frontend", "webapp", "webui", "staticsite", "nextjs", "react", "angular", "vue", "spa", "portal", "dashboard", "clientapp", "ui"]),
    ("client", ["mobileapp", "client", "browser", "mobile", "customer", "actor", "person", "users", "user", "ios", "android", "device", "sensor", "iotdevice"]),
    ("external", ["paymentgateway", "thirdparty", "external", "partner", "stripe", "paypal", "webhook", "notification", "email", "sms", "saas", "integration", "erp", "crm", "twilio", "sendgrid", "mailgun", "vendor", "externalapi"]),
    ("service", ["microservice", "boundedcontext", "orchestrator", "service", "backend", "application", "module", "container", "deployment", "monolith", "domain", "graphql", "grpc", "rest", "api", "app", "server", "saga", "pod"]),
]

TIER_ORDER = ["client", "edge", "application", "integration", "data", "operations"]
TIER_LABELS = {
    "client": "Client & presentation",
    "edge": "Edge & delivery",
    "application": "Application",
    "integration": "Async & integration",
    "data": "Data & storage",
    "operations": "Observability & security",
}
_TIER_OF_TYPE = {
    "client": "client", "frontend": "client",
    "cdn": "edge", "loadbalancer": "edge", "gateway": "edge",
    "service": "application", "function": "application", "worker": "application",
    "queue": "integration", "external": "integration",
    "database": "data", "cache": "data", "storage": "data", "search": "data",
    "monitoring": "operations", "secrets": "operations",
}
_TIER_SYNONYMS = {
    "client": ["client", "presentation", "user", "frontend", "ui"],
    "edge": ["edge", "delivery", "cdn", "gateway", "ingress", "network", "dmz"],
    "application": ["application", "app", "service", "compute", "business", "logic", "backend"],
    "integration": ["integration", "async", "messaging", "event", "queue", "external"],
    "data": ["data", "storage", "database", "persistence", "cache"],
    "operations": ["operations", "observability", "monitoring", "security", "ops", "crosscutting", "platform"],
}


def _compact(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def normalize_type(raw: str) -> str:
    compact = _compact(raw or "")
    if compact in CANONICAL_TYPES:
        return compact
    best_type, best_len = "service", 0
    for canonical, keywords in _TYPE_SYNONYMS:
        for keyword in keywords:
            if keyword in compact and len(keyword) > best_len:
                best_type, best_len = canonical, len(keyword)
    return best_type


def normalize_tier(raw: str | None, node_type: str) -> str:
    if raw:
        compact = _compact(raw)
        if compact in TIER_ORDER:
            return compact
        best_tier, best_len = "", 0
        for tier, keywords in _TIER_SYNONYMS.items():
            for keyword in keywords:
                if keyword in compact and len(keyword) > best_len:
                    best_tier, best_len = tier, len(keyword)
        if best_tier:
            return best_tier
    return _TIER_OF_TYPE.get(normalize_type(node_type), "application")


_ASYNC_WORDS = ["event", "async", "publish", "consume", "subscribe", "queue", "stream", "notify", "notification", "webhook", "message", "emit", "kafka", "sqs", "broadcast", "fireandforget"]
_DATA_WORDS = ["sql", "query", "read", "write", "cache", "replic", "backup", "etl", "project", "persist", "store", "fetch", "transaction", "jdbc", "orm"]


def infer_edge_kind(label: str | None, source_type: str, target_type: str) -> str:
    text = _compact(label or "")
    if any(word in text for word in _ASYNC_WORDS):
        return "async"
    if any(word in text for word in _DATA_WORDS):
        return "data"
    if target_type == "queue":
        return "async"
    if target_type in {"database", "cache", "storage", "search"}:
        return "data"
    if source_type == "queue":
        return "async"
    return "sync"


def normalize_diagram(diagram: Diagram) -> Diagram:
    """Canonicalize node types/tiers and edge kinds so any provider output renders consistently."""
    nodes = [
        DiagramNode(
            id=node.id, label=node.label.strip(), type=normalize_type(node.type),
            description=node.description.strip(), position=node.position,
            tier=normalize_tier(node.tier, node.type),
        )
        for node in diagram.nodes
    ]
    type_by_id = {node.id: node.type for node in nodes}
    edges = [
        DiagramEdge(
            id=edge.id, source=edge.source, target=edge.target,
            label=(edge.label or "").strip() or None,
            kind=edge.kind if edge.kind in {"sync", "async", "data"} else infer_edge_kind(edge.label, type_by_id.get(edge.source, "service"), type_by_id.get(edge.target, "service")),
        )
        for edge in diagram.edges
    ]
    return Diagram(nodes=nodes, edges=edges)