# ASAIP — AI Software Architecture Intelligence Platform

ASAIP is a proof-of-concept decision-support platform that turns software requirements into explainable architecture alternatives, technology recommendations, weighted trade-off analysis, cloud cost estimates, scalability scenarios, architecture reviews, evolution roadmaps, and exportable reports.

The application works end-to-end without an API key through a clearly labeled deterministic demo engine. The backend can also use a hosted model through OpenRouter (OpenAI-compatible chat completions) or directly through Anthropic for requirements analysis and architecture generation. With one OpenRouter key, ASAIP defaults to **free models** (`recursive/flint-v1.0:free`, cost $0) and automatically tries a configured chain of backup free models if the primary is rate-limited or unavailable. `GET /api/config` reports honestly which engine and model answered, and a selected provider with no key is surfaced as a configuration error rather than silently relabeled as AI output. API keys are never sent to the browser.

## Problem statement

Early architecture decisions affect delivery speed, operating cost, reliability, security, and future growth. Teams often compare options informally, making assumptions and trade-offs difficult to explain or revisit. ASAIP provides a structured, reproducible workflow for evaluating those decisions while keeping the reasoning visible.

## Solution and features

- Structured requirements intake with functional, non-functional, constraint, risk, and missing-information analysis.
- Three requirements-aware architecture alternatives per project, with technology stacks, trade-offs, costs, and suitability explanations. With a live provider, each alternative is generated as its own focused model call (run in parallel) so the three options are genuinely different patterns rather than one truncated list.
- Industry-style layered architecture diagrams: components are grouped into six labelled tiers (client, edge, application, integration, data, operations) with category icons and colours, and typed connections (request/response, async event/queue, data read/write). A backend-owned auto-layout keeps the explorer, SVG, PNG, and PDF renderings identical. Component inspection, zoom/pan, fit-to-screen, a legend, and image export are included.
- Adjustable seven-criteria weighted decision matrix with ranking, radar/bar charts, and recommendation reasoning.
- Architecture Critic with severity-rated findings, actionable fixes, and a 0–100 risk score.
- Illustrative AWS, Azure, and Google Cloud cost estimates in INR, including budget utilization and optimization suggestions.
- Current-load, 5×-growth, and 10×-growth scalability analysis.
- Requirements-aware architecture evolution roadmap.
- SQLite-backed project persistence, renaming, deletion, reopening, and saved analyses.
- A calm, light interface built around plain-language labels and sentence-case copy, so each page states what it is doing and what the result came from.
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
 OpenRouter    Scoring, cost,
 and/or        scalability, critic,
 Anthropic     evolution, reports
 (optional)
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
- Optional: an OpenRouter or Anthropic API key for live AI-assisted analysis (not needed for the demo engine)

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
| `AI_PROVIDER` | No | `auto` (default), `demo`, `openrouter`, or `anthropic`. `auto` prefers OpenRouter, then Anthropic, then the labelled demo engine. Naming a provider explicitly without its key returns a 503 configuration error instead of falling back quietly. |
| `OPENROUTER_API_KEY` | No | Enables live AI through OpenRouter's OpenAI-compatible chat completions endpoint. |
| `OPENROUTER_MODEL` | No | Primary model identifier, defaults to the free `recursive/flint-v1.0:free`. |
| `OPENROUTER_FALLBACK_MODELS` | No | Comma-separated free models tried in order when the primary is rate-limited, unavailable, or returns empty output. Defaults to `cohere/north-mini-code:free,openrouter/free`. |
| `OPENROUTER_BASE_URL` | No | Overrides the OpenRouter endpoint, mainly for proxies and offline testing. |
| `OPENROUTER_APP_TITLE` / `OPENROUTER_APP_URL` | No | Optional attribution headers sent to OpenRouter. |
| `ANTHROPIC_API_KEY` | No | Enables live AI through Claude, used when selected directly or when no OpenRouter key exists. |
| `ANTHROPIC_MODEL` | No | Overrides the configured Claude model. |
| `AI_MAX_TOKENS` | No | Shared output ceiling for either live provider (1,024–32,000; default 16,000). Reasoning models spend tokens thinking, so a generous ceiling helps complete diagrams. |
| `ASAIP_DATABASE_URL` | No | SQLAlchemy database URL; defaults to a local SQLite database. |
| `ASAIP_CORS_ORIGINS` | No | Comma-separated allowed frontend origins; `localhost:5173` is allowed by default. |

`GET /api/config` reports the live provider, model, the automatic fallback-model chain, and any configuration error, so the UI can label every result honestly. Free models are rate-limited and can be slower than paid ones: a full three-option generation typically takes about 1–2 minutes. The generating screen shows the active model, an elapsed-time counter, and a note that backup models are tried automatically, and the frontend allows up to 240 seconds for generation.

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

The frontend is available on port 5173 and the backend on port 8000. SQLite data is stored in the `asaip-data` volume. Set `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`, and optionally `AI_PROVIDER`, in the shell or a root `.env` file only if live AI mode is wanted; `docker-compose.yml` forwards those values to the backend container.

## Demo workflow

1. Start both servers and open the frontend.
2. Select **Open the sample project** on Overview, or open **Smart E-Commerce Platform** from **My projects**. To build one from scratch, use **New project** and **Fill with a sample**.
3. Inspect the structured requirements and confirm the **Demo engine result (no AI used)** badge.
4. Open **System designs** and switch among the three generated alternatives.
5. Select diagram components, inspect their responsibilities, pan/zoom, fit the diagram, and export it.
6. Open **Compare options**. Adjust the weights, verify the total stays at 100%, and run the comparison.
7. Run a fresh **Design review** and inspect severity, affected components, and recommended fixes.
8. Use **Cost estimate** for AWS, Azure, or Google Cloud. Explain that prices use configurable assumptions rather than live pricing.
9. Inspect the current, 5×, and 10× scenarios in **Growth analysis**, then the staged path in **Evolution roadmap**.
10. Open **Reports and exports** and download the PDF and JSON outputs.
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

Verified on 10 November 2026: **29 tests passed** in about two seconds with no network access. The suite forces `AI_PROVIDER=demo` and strips any real `OPENROUTER_API_KEY`/`ANTHROPIC_API_KEY` from the environment after config load, so a developer's live key never makes the tests call a paid or rate-limited endpoint. Provider tests cover the per-pattern parallel generation contract, the free-model fallback chain (rate-limit and empty-content fallthrough), adaptive JSON-mode handling, bounded JSON repair, terminal auth/credit errors, and tolerance of hallucinated extra fields in model output. One upstream Starlette deprecation warning is emitted by the installed FastAPI test client dependency; it does not affect the test result.

Frontend production validation:

```powershell
cd frontend
npm run build
```

Verified on 10 November 2026: TypeScript checking and the Vite production build complete successfully. A live end-to-end run with the free `recursive/flint-v1.0:free` model (cost $0) generated three genuinely different, industry-style alternatives — modular monolith, serverless, and event-driven — each with 16–19 project-specific components across all six tiers, typed connections (request/response, async event/queue, data read/write), and real AWS labels such as CloudFront, Application Load Balancer, Aurora PostgreSQL, ElastiCache Redis, S3, OpenSearch, SQS, Cognito, CloudWatch, Secrets Manager, and Stripe. In the browser, the explorer renders the coloured tier bands, category icons, legend, option cards, and component-details panel with no console errors; the SVG export reproduces every typed connection and tier band from the same component geometry, and the PDF report exports a valid multi-page document containing the layered diagram. The seeded **Smart E-Commerce Platform** fixture was refreshed so it showcases the same tiered diagram style offline in demo mode. Earlier walkthroughs also covered the new-project wizard, rename/delete, Design review, Cost estimate, Growth analysis, Evolution roadmap, and PDF/JSON export; the comparison weights were verified end to end (non-default weights produced exactly the hand-computed scores and ranks, and resetting returned the defaults), and a deliberately misconfigured provider (`AI_PROVIDER=openrouter` with no key) reported `ai_configured: false` plus a `provider_error` and answered analysis requests with HTTP 503 rather than silently falling back to the demo engine.

## Limitations

- This is a PoC, not a production cloud provisioning or architecture governance system.
- Demo mode uses deterministic heuristics and predefined domain knowledge; it does not claim to invoke an AI model. Conversely, a live OpenRouter or Anthropic failure is reported rather than quietly re-labelled as an AI result.
- Cloud prices are illustrative estimates from configurable assumptions. They are not live quotes and vary by region, usage, taxes, discounts, and provider pricing.
- Architecture scores support comparison but do not replace load testing, threat modeling, compliance review, or expert engineering judgment.
- The PDF reproduces the layered diagram (tier bands, typed connections, and component labels) scaled to page width; the interactive explorer adds zoom/pan, fit-to-screen, and per-component inspection.
- SQLite and the single-user workflow are intentional PoC choices. Authentication, organizations, role-based access, asynchronous jobs, and production observability are out of scope.

## Future enhancements

- PostgreSQL deployment and authenticated multi-user workspaces.
- Further LLM providers behind the existing provider abstraction, now that OpenRouter and Anthropic share one validated-JSON pipeline.
- Live cloud pricing integrations with provenance and refresh timestamps.
- Architecture Decision Records, custom templates, and collaborative comments.
- Terraform/CDK generation with human review and policy validation.
- Historical load and incident data to calibrate scoring and scalability assumptions.
