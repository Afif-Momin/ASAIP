from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import __version__
from ..config import anthropic_key, anthropic_model
from ..database import get_db
from ..models import Architecture, Comparison, Project
from ..schemas import (
    ArchitectureResponse,
    ComparisonResponse,
    ComparisonWeights,
    ConfigResponse,
    CostAnalysis,
    CostRequest,
    CriticReview,
    EvolutionAnalysis,
    HealthResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ReportRequest,
    RequirementsAnalysis,
    ScalabilityAnalysis,
)
from ..services.ai_provider import AIProviderError, get_ai_provider
from ..services.architecture_critic import review_architecture
from ..services.architecture_generator import generate_fallback_architectures
from ..services.cost_estimator import estimate_cost, normalize_provider
from ..services.evolution_service import plan_evolution
from ..services.report_generator import generate_pdf_report
from ..services.requirements_service import analyze_requirements
from ..services.scalability_analyzer import analyze_scalability
from ..services.scoring_engine import compare_architectures, score_architecture

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def project_or_404(project_id: int, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} was not found")
    return project


def architecture_or_404(architecture_id: int, db: Session) -> Architecture:
    architecture = db.get(Architecture, architecture_id)
    if not architecture:
        raise HTTPException(status_code=404, detail=f"Architecture {architecture_id} was not found")
    return architecture


def requirements_for(project: Project):
    provider = get_ai_provider()
    if provider:
        return provider.analyze_requirements(project)
    return analyze_requirements(project)


def ensure_comparison(project: Project, db: Session, persist: bool = True) -> ComparisonResponse:
    if not project.architectures:
        raise HTTPException(status_code=409, detail="Generate architectures before comparing this project")
    if project.comparison:
        return ComparisonResponse.model_validate(project.comparison)
    result = compare_architectures(project, project.architectures, ComparisonWeights())
    if persist:
        db.add(Comparison(**result.model_dump(mode="json", exclude={"project_id"}), project=project))
        db.commit()
    return result


def collect_analyses(project: Project) -> dict[int, dict]:
    analyses: dict[int, dict] = {}
    for architecture in project.architectures:
        analyses[architecture.id] = {
            "cost": CostAnalysis.model_validate(architecture.cost_analysis) if architecture.cost_analysis else estimate_cost(architecture, project),
            "scalability": ScalabilityAnalysis.model_validate(architecture.scalability_analysis) if architecture.scalability_analysis else analyze_scalability(architecture, project),
            "critic": CriticReview.model_validate(architecture.critic_review) if architecture.critic_review else review_architecture(architecture, project),
            "evolution": EvolutionAnalysis.model_validate(architecture.evolution_analysis) if architecture.evolution_analysis else plan_evolution(architecture, project),
        }
    return analyses


@router.get("/health", response_model=HealthResponse, tags=["System"])
def health(db: Session = Depends(get_db)) -> HealthResponse:
    db.execute(text("SELECT 1"))
    return HealthResponse(version=__version__)


@router.get("/config", response_model=ConfigResponse, tags=["System"])
def public_config() -> ConfigResponse:
    configured = bool(anthropic_key())
    return ConfigResponse(
        analysis_mode="ai" if configured else "demo",
        ai_configured=configured,
        ai_model=anthropic_model() if configured else None,
        supported_providers=["AWS", "Azure", "GCP"],
    )


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, tags=["Projects"])
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> Project:
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    logger.info("Created project %s", project.id)
    return project


@router.get("/projects", response_model=list[ProjectResponse], tags=["Projects"])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return db.query(Project).order_by(Project.updated_at.desc(), Project.id.desc()).all()


@router.get("/projects/{project_id}", response_model=ProjectResponse, tags=["Projects"])
def get_project(project_id: int, db: Session = Depends(get_db)) -> Project:
    return project_or_404(project_id, db)


@router.put("/projects/{project_id}", response_model=ProjectResponse, tags=["Projects"])
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)) -> Project:
    project = project_or_404(project_id, db)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    logger.info("Updated project %s fields=%s", project.id, sorted(changes))
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Projects"])
def delete_project(project_id: int, db: Session = Depends(get_db)) -> Response:
    project = project_or_404(project_id, db)
    db.delete(project)
    db.commit()
    logger.info("Deleted project %s", project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/projects/{project_id}/analyze-requirements", response_model=RequirementsAnalysis, tags=["Requirements"])
def analyze_project_requirements(project_id: int, db: Session = Depends(get_db)) -> RequirementsAnalysis:
    project = project_or_404(project_id, db)
    try:
        result = requirements_for(project)
    except AIProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    project.requirements_analysis = result.model_dump(mode="json")
    db.commit()
    return result


@router.post("/projects/{project_id}/generate-architectures", response_model=list[ArchitectureResponse], tags=["Architectures"])
def generate_project_architectures(project_id: int, db: Session = Depends(get_db)) -> list[Architecture]:
    project = project_or_404(project_id, db)
    provider = get_ai_provider()
    try:
        analysis = (
            RequirementsAnalysis.model_validate(project.requirements_analysis)
            if project.requirements_analysis
            else requirements_for(project)
        )
        drafts = provider.generate_architectures(project, analysis) if provider else generate_fallback_architectures(project)
    except AIProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    project.requirements_analysis = analysis.model_dump(mode="json")
    if project.comparison:
        db.delete(project.comparison)
    for existing in list(project.architectures):
        db.delete(existing)
    db.flush()
    mode = "ai" if provider else "demo"
    architectures = [
        Architecture(**draft.model_dump(), analysis_mode=mode, project=project)
        for draft in drafts
    ]
    for architecture in architectures:
        architecture.scores = score_architecture(architecture, project).model_dump()
    db.add_all(architectures)
    db.flush()
    db.commit()
    logger.info("Generated %s architectures for project %s using %s mode", len(architectures), project.id, mode)
    return architectures


@router.get("/projects/{project_id}/architectures", response_model=list[ArchitectureResponse], tags=["Architectures"])
def list_architectures(project_id: int, db: Session = Depends(get_db)) -> list[Architecture]:
    return project_or_404(project_id, db).architectures


@router.get("/architectures/{architecture_id}", response_model=ArchitectureResponse, tags=["Architectures"])
def get_architecture(architecture_id: int, db: Session = Depends(get_db)) -> Architecture:
    return architecture_or_404(architecture_id, db)


@router.post("/projects/{project_id}/compare", response_model=ComparisonResponse, tags=["Comparison"])
def create_comparison(project_id: int, weights: ComparisonWeights, db: Session = Depends(get_db)) -> Comparison:
    project = project_or_404(project_id, db)
    if not project.architectures:
        raise HTTPException(status_code=409, detail="Generate architectures before comparing this project")
    result = compare_architectures(project, project.architectures, weights)
    if project.comparison:
        comparison = project.comparison
        comparison.weights = result.weights.model_dump()
        comparison.results = [item.model_dump() for item in result.results]
        comparison.recommended_architecture_id = result.recommended_architecture_id
        comparison.explanation = result.explanation
    else:
        comparison = Comparison(**result.model_dump(mode="json", exclude={"project_id"}), project=project)
        db.add(comparison)
    db.commit()
    db.refresh(comparison)
    return comparison


@router.get("/projects/{project_id}/comparison", response_model=ComparisonResponse, tags=["Comparison"])
def get_comparison(project_id: int, db: Session = Depends(get_db)) -> Comparison:
    project = project_or_404(project_id, db)
    if not project.comparison:
        raise HTTPException(status_code=404, detail="No comparison exists; POST compare with weights first")
    return project.comparison


@router.post("/architectures/{architecture_id}/review", response_model=CriticReview, tags=["Architecture Critic"])
def run_review(architecture_id: int, db: Session = Depends(get_db)) -> CriticReview:
    architecture = architecture_or_404(architecture_id, db)
    result = review_architecture(architecture, architecture.project)
    architecture.critic_review = result.model_dump(mode="json")
    db.commit()
    return result


@router.post("/architectures/{architecture_id}/estimate-cost", response_model=CostAnalysis, tags=["Cost"])
def run_cost_estimate(
    architecture_id: int, payload: CostRequest | None = None, db: Session = Depends(get_db)
) -> CostAnalysis:
    architecture = architecture_or_404(architecture_id, db)
    try:
        provider = normalize_provider(payload.provider if payload else None, architecture.project.cloud_provider)
        result = estimate_cost(architecture, architecture.project, provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    architecture.cost_analysis = result.model_dump(mode="json")
    db.commit()
    return result


@router.post("/architectures/{architecture_id}/analyze-scalability", response_model=ScalabilityAnalysis, tags=["Scalability"])
def run_scalability_analysis(architecture_id: int, db: Session = Depends(get_db)) -> ScalabilityAnalysis:
    architecture = architecture_or_404(architecture_id, db)
    result = analyze_scalability(architecture, architecture.project)
    architecture.scalability_analysis = result.model_dump(mode="json")
    db.commit()
    return result


@router.post("/architectures/{architecture_id}/evolution", response_model=EvolutionAnalysis, tags=["Evolution"])
def run_evolution_analysis(architecture_id: int, db: Session = Depends(get_db)) -> EvolutionAnalysis:
    architecture = architecture_or_404(architecture_id, db)
    result = plan_evolution(architecture, architecture.project)
    architecture.evolution_analysis = result.model_dump(mode="json")
    db.commit()
    return result


@router.post("/projects/{project_id}/export-report", tags=["Reports"])
def export_pdf_report(project_id: int, payload: ReportRequest, db: Session = Depends(get_db)) -> Response:
    if payload.format != "pdf":  # guarded by Pydantic; keeps the content contract explicit
        raise HTTPException(status_code=400, detail="Only PDF report export is supported")
    project = project_or_404(project_id, db)
    if not project.architectures:
        raise HTTPException(status_code=409, detail="Generate architectures before exporting a report")
    comparison = ensure_comparison(project, db)
    report = generate_pdf_report(project, comparison, collect_analyses(project))
    safe_name = "".join(character if character.isalnum() or character in "-_" else "-" for character in project.name).strip("-") or "project"
    return Response(
        content=report,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}-architecture-report.pdf"'},
    )


@router.get("/projects/{project_id}/export-json", tags=["Reports"])
def export_json(project_id: int, db: Session = Depends(get_db)) -> dict:
    project = project_or_404(project_id, db)
    if not project.architectures:
        raise HTTPException(status_code=409, detail="Generate architectures before exporting an analysis")
    comparison = ensure_comparison(project, db, persist=False)
    analyses = collect_analyses(project)
    return {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project": ProjectResponse.model_validate(project).model_dump(mode="json"),
        "comparison": comparison.model_dump(mode="json"),
        "architecture_analyses": {
            str(architecture_id): {
                key: value.model_dump(mode="json") for key, value in values.items()
            }
            for architecture_id, values in analyses.items()
        },
    }
