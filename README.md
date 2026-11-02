# ASAIP — AI Software Architecture Intelligence Platform

ASAIP is a proof-of-concept decision-support platform that turns software requirements into explainable architecture alternatives, technology recommendations, weighted trade-off analysis, cloud cost estimates, scalability scenarios, architecture reviews, evolution roadmaps, and exportable reports.

The application works end-to-end without an API key through a clearly labeled deterministic demo engine. When an Anthropic API key is configured, the backend can use Claude for requirements analysis and architecture generation. API keys are never sent to the browser.

## Problem statement

Early architecture decisions affect delivery speed, operating cost, reliability, security, and future growth. Teams often compare options informally, making assumptions and trade-offs difficult to explain or revisit. ASAIP provides a structured, reproducible workflow for evaluating those decisions while keeping the reasoning visible.

## Solution and features

- Structured requirements intake with functional, non-functional, constraint, risk, and missing-information analysis.
- Three requirements-aware architecture alternatives per project, with technology stacks, trade-offs, costs, and suitability explanations.
- Dynamic architecture diagrams with component inspection, zoom/pan, fit-to-screen, and image export.
- Adjustable seven-criteria weighted decision matrix with ranking, radar/bar charts, and recommendation reasoning.
- Architecture Critic with severity-rated findings, actionable fixes, and a 0–100 risk score.
- Illustrative AWS, Azure, and Google Cloud cost estimates in INR, including budget utilization and optimization suggestions.
- Current-load, 5×-growth, and 10×-growth scalability analysis.
- Requirements-aware architecture evolution roadmap.
- SQLite-backed project persistence, renaming, deletion, reopening, and saved analyses.
- Real PDF and JSON report exports.
- A seeded **Smart E-Commerce Platform** project for immediate demonstrations.

## Innovation method

The PoC maps directly to the Creative Intelligence for Engineers group-project method: design thinking frames the requirements; morphological analysis explores distinct architecture combinations; the weighted decision matrix supports selection and what-if sensitivity analysis; inverse thinking drives Architecture Critic failure analysis. The goal is not to automate responsibility away, but to make engineering reasoning, assumptions, and societal considerations such as cost, security, reliability, and maintainability easier to inspect.

## System architecture

```text
React + TypeScript frontend (Vite, Tailwind CSS)
                    │ REST / JSON
                    ▼
             FastAPI application
                    │
      ┌─────────────┼──────────────┐
      ▼             ▼              ▼
 AI provider   Analysis engines   SQLAlchemy
 abstraction   and validators       │
      │             │               ▼
      ▼             ▼             SQLite
 Anthropic     Scoring, cost,
 Claude API    scalability, critic,
 (optional)    evolution, reports
```

The frontend uses React Flow for interactive diagrams and Recharts for data visualizations. The backend uses Pydantic models at API and AI-output boundaries. The database layer uses SQLAlchemy so the PoC can move from SQLite to PostgreSQL with an appropriate driver and deployment configuration.

## Project structure

```text
asaip/
├── frontend/             # React application and reusable UI modules
│   └── src/
│       ├── components/
│       ├── features/
│       ├── layouts/
│       ├── pages/
│       ├── services/
│       └── types/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Python 3.11 or newer (validated with Python 3.13)
- Node.js 20 or newer and npm
- Optional: Docker and Docker Compose
- Optional: an Anthropic API key for live AI-assisted analysis

## Local installation

### 1. Backend

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Windows (Git Bash):

```bash
source .venv/Scripts/activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install and run:

```bash
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On Windows, copy `.env.example` to `.env` with `copy .env.example .env` in Command Prompt if `cp` is unavailable. The application also starts without a `.env` file.

Backend URLs:

- API: http://localhost:8000
- Interactive Swagger documentation: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open http://localhost:5173.

## Environment configuration

Backend variables are documented in `backend/.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Enables Claude-backed requirements analysis and architecture generation. Leave empty for the deterministic demo engine. |
| `ANTHROPIC_MODEL` | No | Overrides the configured Claude model. |
| `DATABASE_URL` | No | SQLAlchemy database URL; defaults to a local SQLite database. |
| `FRONTEND_URL` | No | Allowed frontend origin for CORS. |

Frontend:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | No | Backend base URL; defaults to `http://localhost:8000`. |

After changing frontend environment variables, restart Vite. Never prefix backend secrets with `VITE_`, because Vite exposes those values to browser code.

## Docker Compose

Start Docker Desktop (or your Docker daemon), then run from the project root:

```bash
docker compose up --build
```

The frontend is available on port 5173 and the backend on port 8000. SQLite data is stored in the `asaip-data` volume. Set `ANTHROPIC_API_KEY` in the shell or a root `.env` file only if live AI mode is wanted.

## Demo workflow

1. Start both servers and open the frontend.
2. Select **Load Demo Project** or open **Smart E-Commerce Platform** from My Projects.
3. Inspect the structured requirements and confirm the **Demo engine** label.
4. Open Architecture Explorer and switch among the three generated alternatives.
5. Select diagram components, inspect their responsibilities, pan/zoom, fit the diagram, and export it.
6. Open Comparison & Decision Matrix. Adjust weights, verify the total remains 100%, and run the comparison.
7. Run a fresh Architecture Critic review and inspect severity, affected components, and recommended fixes.
8. Estimate costs for AWS, Azure, or Google Cloud. Explain that prices use configurable assumptions rather than live pricing.
9. Inspect the current, 5×, and 10× scalability scenarios and the evolution roadmap.
10. Open Reports and download the PDF and JSON outputs.
11. Create a new project to demonstrate persistence, requirement analysis, architecture generation, renaming, reopening, and deletion.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/projects` | Create a project |
| GET | `/api/projects` | List saved projects |
| GET | `/api/projects/{project_id}` | Read project and analyses |
| PUT | `/api/projects/{project_id}` | Update requirements or rename |
| DELETE | `/api/projects/{project_id}` | Delete a project |
| POST | `/api/projects/{project_id}/analyze-requirements` | Analyze requirements |
| POST | `/api/projects/{project_id}/generate-architectures` | Generate three alternatives |
| GET | `/api/projects/{project_id}/architectures` | List alternatives |
| GET | `/api/architectures/{architecture_id}` | Read one alternative |
| POST | `/api/projects/{project_id}/compare` | Calculate weighted ranking |
| GET | `/api/projects/{project_id}/comparison` | Read saved comparison |
| POST | `/api/architectures/{architecture_id}/review` | Run Architecture Critic |
| POST | `/api/architectures/{architecture_id}/estimate-cost` | Estimate infrastructure costs |
| POST | `/api/architectures/{architecture_id}/analyze-scalability` | Analyze growth scenarios |
| POST | `/api/architectures/{architecture_id}/evolution` | Generate evolution roadmap |
| POST | `/api/projects/{project_id}/export-report` | Download PDF report |
| GET | `/api/projects/{project_id}/export-json` | Download JSON report |

See Swagger for request and response schemas.

## Verification

Backend:

```powershell
cd backend
python -m pytest -q
```

Verified on 2 November 2026: **12 tests passed**. One upstream Starlette deprecation warning is emitted by the installed FastAPI test client dependency; it does not affect the test result.

Frontend production validation:

```powershell
cd frontend
npm run build
```

Verified on 2 November 2026: TypeScript checking and the Vite production build completed successfully. Browser smoke tests also covered project creation/analysis/generation/deletion, diagrams, comparison validation, critic, cost, scalability, evolution, and PDF/JSON export with no console errors.

## Limitations

- This is a PoC, not a production cloud provisioning or architecture governance system.
- Demo mode uses deterministic heuristics and predefined domain knowledge; it does not claim to invoke an AI model.
- Cloud prices are illustrative estimates from configurable assumptions. They are not live quotes and vary by region, usage, taxes, discounts, and provider pricing.
- Architecture scores support comparison but do not replace load testing, threat modeling, compliance review, or expert engineering judgment.
- PDF diagrams are simplified report renderings; the interactive explorer provides the full diagram experience.
- SQLite and the single-user workflow are intentional PoC choices. Authentication, organizations, role-based access, asynchronous jobs, and production observability are out of scope.

## Future enhancements

- PostgreSQL deployment and authenticated multi-user workspaces.
- Additional LLM providers behind the existing provider abstraction.
- Live cloud pricing integrations with provenance and refresh timestamps.
- Architecture Decision Records, custom templates, and collaborative comments.
- Terraform/CDK generation with human review and policy validation.
- Historical load and incident data to calibrate scoring and scalability assumptions.
