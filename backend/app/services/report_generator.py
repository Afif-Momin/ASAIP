from __future__ import annotations

from html import escape
from io import BytesIO
from typing import Any

from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..models import Architecture, Project
from ..schemas import ComparisonResponse


def _text(value: object) -> str:
    return escape(str(value))


def _architecture_diagram(architecture: Architecture) -> Drawing:
    nodes = architecture.diagram.get("nodes", [])
    max_x = max((float(node["position"]["x"]) for node in nodes), default=500)
    max_y = max((float(node["position"]["y"]) for node in nodes), default=300)
    width, height = 470, 260
    sx = (width - 100) / max(max_x, 1)
    sy = (height - 70) / max(max_y, 1)
    scale = min(sx, sy, 0.42)

    def xy(node_id: str) -> tuple[float, float]:
        node = next(item for item in nodes if item["id"] == node_id)
        return 15 + float(node["position"]["x"]) * scale, height - 35 - float(node["position"]["y"]) * scale

    drawing = Drawing(width, height)
    drawing.add(Rect(0, 0, width, height, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#CBD5E1")))
    for edge in architecture.diagram.get("edges", []):
        try:
            x1, y1 = xy(edge["source"])
            x2, y2 = xy(edge["target"])
        except (KeyError, StopIteration):
            continue
        drawing.add(Line(x1 + 38, y1, x2 + 38, y2, strokeColor=colors.HexColor("#64748B"), strokeWidth=0.8))
    for node in nodes:
        x, y = xy(node["id"])
        drawing.add(Rect(x, y - 14, 82, 30, rx=4, ry=4, fillColor=colors.HexColor("#E7EFF4"), strokeColor=colors.HexColor("#276582")))
        drawing.add(String(x + 41, y + 3, str(node["label"])[:20], textAnchor="middle", fontSize=6.2, fillColor=colors.HexColor("#1D2B38")))
        drawing.add(String(x + 41, y - 7, str(node["type"])[:20], textAnchor="middle", fontSize=5.5, fillColor=colors.HexColor("#475569")))
    drawing.add(String(12, 10, f"Rendered from {len(nodes)} components and {len(architecture.diagram.get('edges', []))} connections", fontSize=6.5, fillColor=colors.HexColor("#64748B")))
    return drawing


def generate_pdf_report(
    project: Project,
    comparison: ComparisonResponse,
    analyses: dict[int, dict[str, Any]],
) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer, pagesize=A4, rightMargin=17 * mm, leftMargin=17 * mm,
        topMargin=17 * mm, bottomMargin=17 * mm,
        title=f"ASAIP Architecture Report - {project.name}", author="ASAIP",
        subject="Explainable software architecture decision report",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("ReportTitle", parent=styles["Title"], textColor=colors.HexColor("#1d2b38"), fontSize=22, leading=28, alignment=TA_CENTER, spaceAfter=16)
    heading = ParagraphStyle("Section", parent=styles["Heading1"], textColor=colors.HexColor("#276582"), fontSize=14, leading=18, spaceBefore=12, spaceAfter=7, keepWithNext=True)
    subheading = ParagraphStyle("Subsection", parent=styles["Heading2"], textColor=colors.HexColor("#2c7a7b"), fontSize=10.5, leading=14, spaceBefore=8, spaceAfter=4, keepWithNext=True)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=8.7, leading=12.5, spaceAfter=5)
    bullet = ParagraphStyle("Bullet", parent=body, leftIndent=12, firstLineIndent=-7, bulletIndent=3, spaceAfter=3)
    small = ParagraphStyle("Small", parent=body, fontSize=7.3, leading=9.5)

    story: list = []
    story += [Paragraph("ASAIP", title), Paragraph(f"Architecture Intelligence Report: {_text(project.name)}", title)]
    story += [Paragraph("AI Software Architecture Intelligence Platform", body), Paragraph(
        "This report contains persisted project requirements and deterministic decision, cost, scalability, critic, and evolution analyses. Cost figures are illustrative and not live cloud quotes.", body)]

    def section(number: int, name: str) -> None:
        story.append(Paragraph(f"{number}. {name}", heading))

    def para(value: object, style=body) -> None:
        story.append(Paragraph(_text(value), style))

    def bullets(values: list[str]) -> None:
        for value in values or ["Not specified"]:
            story.append(Paragraph("• " + _text(value), bullet))

    def table(rows: list[list[object]], widths=None, font_size=7.2) -> None:
        converted = [[Paragraph(_text(cell), small) for cell in row] for row in rows]
        item = Table(converted, colWidths=widths, repeatRows=1, hAlign="LEFT")
        item.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E7EFF4")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1D2B38")),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ]))
        story.append(item)
        story.append(Spacer(1, 6))

    architectures = list(project.architectures)
    recommended = next((item for item in architectures if item.id == comparison.recommended_architecture_id), architectures[0])
    analysis = project.requirements_analysis or {}

    section(1, "Executive Summary")
    para(analysis.get("summary", project.description))
    para(comparison.explanation)
    section(2, "Project Overview")
    table([
        ["Attribute", "Project input"], ["Domain", project.domain], ["Target users", project.target_users],
        ["Concurrent users", f"{project.concurrent_users:,}"], ["Daily requests", f"{project.daily_requests:,}"],
        ["Team / budget", f"{project.team_size} people / INR {project.budget:,.0f} per month"],
        ["Cloud / deployment", f"{project.cloud_provider} / {project.deployment_preference}"],
        ["Availability / growth", f"{project.availability} / {project.growth}"],
        ["Data sensitivity", project.data_sensitivity],
    ], widths=[135, 350])
    section(3, "Functional Requirements")
    bullets(analysis.get("functional_requirements", project.functional_requirements))
    section(4, "Non-Functional Requirements")
    bullets(analysis.get("non_functional_requirements", project.non_functional_requirements))
    story.append(Paragraph("Constraints and omissions", subheading))
    bullets(analysis.get("constraints", []) + analysis.get("missing_requirements", []))

    section(5, "Architecture Alternatives")
    for architecture in architectures:
        story.append(Paragraph(f"{_text(architecture.name)} — {_text(architecture.pattern)}", subheading))
        para(architecture.description)
        para(f"Complexity: {architecture.complexity}. Initial development estimate: INR {architecture.initial_development_cost:,.0f}. Monthly baseline: INR {architecture.monthly_infrastructure_cost:,.0f}.")
        para(architecture.suitability_explanation)

    section(6, "Recommended Architecture")
    para(f"{recommended.name} ({recommended.pattern})")
    para(comparison.explanation)
    bullets(recommended.advantages)
    section(7, "Architecture Diagram")
    para(f"Recommended topology: {recommended.name}")
    story += [_architecture_diagram(recommended), Spacer(1, 6)]
    bullets([f"{node['label']}: {node['description']}" for node in recommended.diagram.get("nodes", [])])

    section(8, "Technology Stack")
    rows = [["Layer", "Recommended technologies"]]
    rows += [[key.replace("_", " ").title(), ", ".join(value)] for key, value in recommended.technology_stack.items()]
    table(rows, widths=[110, 375])
    section(9, "Weighted Decision Matrix")
    weights = comparison.weights.model_dump()
    rows = [["Architecture", *[key.replace("_", " ").title() for key in weights], "Weighted", "Rank"]]
    for result in comparison.results:
        rows.append([result.architecture_name, *[f"{getattr(result.scores, key):.1f}" for key in weights], f"{result.weighted_score:.3f}", result.rank])
    table(rows, font_size=5.7)
    para("Weights: " + ", ".join(f"{key.replace('_', ' ')} {value:g}%" for key, value in weights.items()))

    section(10, "Scalability Analysis")
    scalability = analyses[recommended.id]["scalability"]
    para(scalability.explanation)
    rows = [["Scenario", "Users", "Peak RPS", "Monthly INR", "Strategy"]]
    rows += [[item.name, f"{item.expected_users:,}", item.requests_per_second, f"{item.estimated_monthly_cost:,.0f}", item.scaling_strategy] for item in scalability.scenarios]
    table(rows, widths=[70, 60, 55, 70, 230])
    for item in scalability.scenarios:
        story.append(Paragraph(item.name, subheading))
        bullets(item.infrastructure_changes + item.bottlenecks + item.performance_risks)

    section(11, "Security Analysis")
    for architecture in architectures:
        story.append(Paragraph(architecture.name, subheading))
        para(architecture.security_strategy)
    section(12, "Maintainability Analysis")
    for architecture in architectures:
        story.append(Paragraph(architecture.name, subheading))
        para(architecture.maintainability_assessment)

    section(13, "Cloud Cost Estimation")
    for architecture in architectures:
        cost = analyses[architecture.id]["cost"]
        story.append(Paragraph(f"{architecture.name} — {cost.provider}", subheading))
        para(f"Setup INR {cost.setup_cost:,.0f}; monthly INR {cost.monthly_cost:,.0f}; annual INR {cost.annual_cost:,.0f}; budget utilization {cost.budget_utilization:.2f}%.")
        table([["Component", "Monthly INR", "Assumption"], *[[item.component, f"{item.monthly_cost:,.2f}", item.details] for item in cost.breakdown]], widths=[90, 70, 325])
        bullets(cost.optimization_suggestions)
        para(cost.disclaimer)

    section(14, "Architecture Critic Findings")
    for architecture in architectures:
        critic = analyses[architecture.id]["critic"]
        story.append(Paragraph(f"{architecture.name} — risk {critic.risk_score}/100", subheading))
        para(critic.summary)
        rows = [["Severity", "Issue / component", "Recommended fix", "Expected improvement"]]
        rows += [[issue.severity, f"{issue.title} ({issue.affected_component}): {issue.explanation} {issue.why_it_matters}", issue.recommended_fix, issue.expected_improvement] for issue in critic.issues]
        table(rows, widths=[48, 190, 145, 102])

    section(15, "Architecture Trade-offs")
    for architecture in architectures:
        story.append(Paragraph(architecture.name, subheading))
        bullets(architecture.tradeoffs + architecture.disadvantages)

    section(16, "Architecture Evolution Roadmap")
    evolution = analyses[recommended.id]["evolution"]
    para(evolution.summary)
    for stage in evolution.stages:
        story.append(Paragraph(f"Stage {stage.stage}: {stage.name} ({stage.complexity}; +INR {stage.cost_impact:,.0f}/month)", subheading))
        para(stage.description)
        bullets(stage.changes + stage.reasons + stage.new_components + stage.benefits)

    section(17, "Conclusion")
    para(f"ASAIP recommends {recommended.name} for the current requirements and weights, with a weighted score of {next(result.weighted_score for result in comparison.results if result.architecture_id == recommended.id):.3f}/10. This is a requirement-specific decision, not a universal endorsement of its pattern.")
    para("Before implementation, resolve the listed requirements questions, validate cloud pricing, threat-model sensitive workflows, run representative load tests, and practice backup restoration. Revisit the decision matrix when constraints or priorities change.")

    def add_page_number(canvas, doc) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawRightString(A4[0] - 17 * mm, 9 * mm, f"ASAIP | Page {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return buffer.getvalue()
