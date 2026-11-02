from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Architecture, Comparison, Project
from ..schemas import ComparisonWeights
from .architecture_critic import review_architecture
from .architecture_generator import generate_fallback_architectures
from .cost_estimator import estimate_cost
from .evolution_service import plan_evolution
from .requirements_service import analyze_requirements
from .scalability_analyzer import analyze_scalability
from .scoring_engine import compare_architectures, score_architecture

logger = logging.getLogger(__name__)
DEMO_PROJECT_NAME = "Smart E-Commerce Platform"


def seed_demo(db: Session) -> Project:
    existing = db.scalar(select(Project).where(Project.name == DEMO_PROJECT_NAME))
    if existing:
        return existing
    project = Project(
        name=DEMO_PROJECT_NAME,
        description=(
            "Develop a smart e-commerce platform for 50,000 registered users and 5,000 concurrent users. "
            "It supports product catalog search, shopping cart, secure payment integration, order management, "
            "real-time inventory management, order tracking, and an admin analytics dashboard. It must be highly "
            "available, secure, maintainable, scalable, and cost-efficient."
        ),
        domain="E-commerce",
        target_users="50,000 registered shoppers, internal merchandisers, support agents, and administrators",
        concurrent_users=5000,
        daily_requests=2_500_000,
        functional_requirements=[
            "Product catalog browsing, filtering, and search",
            "Persistent shopping cart and checkout",
            "Secure payment integration, refunds, and reconciliation",
            "Order placement, tracking, cancellation, and history",
            "Inventory reservation and stock management",
            "Admin dashboard for products, orders, and sales analytics",
            "Customer registration, profiles, and secure authentication",
        ],
        non_functional_requirements=[
            "High availability during sales peaks",
            "Scalable infrastructure with cost-efficient cloud deployment",
            "Secure authentication and protection of payment-adjacent data",
            "Maintainable modules with observable business transactions",
            "Interactive catalog reads under 500 ms at the 95th percentile",
        ],
        budget=120_000,
        team_size=6,
        preferred_languages=["Python", "TypeScript"],
        cloud_provider="AWS",
        data_sensitivity="High",
        availability="99.95%",
        growth="High growth with 5x seasonal peaks",
        deployment_preference="Cloud containers with managed data services",
    )
    db.add(project)
    db.flush()
    project.requirements_analysis = analyze_requirements(project).model_dump(mode="json")
    architectures = [
        Architecture(**draft.model_dump(), analysis_mode="demo", project=project)
        for draft in generate_fallback_architectures(project)
    ]
    for architecture in architectures:
        architecture.scores = score_architecture(architecture, project).model_dump()
    db.add_all(architectures)
    db.flush()
    for architecture in architectures:
        architecture.cost_analysis = estimate_cost(architecture, project).model_dump(mode="json")
        architecture.scalability_analysis = analyze_scalability(architecture, project).model_dump(mode="json")
        architecture.critic_review = review_architecture(architecture, project).model_dump(mode="json")
        architecture.evolution_analysis = plan_evolution(architecture, project).model_dump(mode="json")
    comparison_data = compare_architectures(project, architectures, ComparisonWeights())
    db.add(Comparison(**comparison_data.model_dump(mode="json", exclude={"project_id"}), project=project))
    db.commit()
    logger.info("Seeded fully analyzed demo project with %s architectures", len(architectures))
    return db.scalar(
        select(Project).options(selectinload(Project.architectures)).where(Project.id == project.id)
    ) or project
