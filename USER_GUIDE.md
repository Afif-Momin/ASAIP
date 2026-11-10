# ASAIP User Guide

## 1. What ASAIP helps you do

ASAIP — **AI Software Architecture Intelligence Platform** — helps you turn a software idea into architecture options that can be compared and explained.

It is designed for students, engineers, startups, and technical teams who need to answer questions such as:

- Which architecture fits these requirements?
- What technology stack could support it?
- What trade-offs am I accepting?
- Where could the design fail?
- What might the infrastructure cost?
- How should the architecture change as usage grows?

ASAIP is a **decision-support tool**, not an automatic replacement for engineering review. Its scores, costs, risks, and recommendations should be validated with real measurements and domain expertise.

## 2. The built-in engine and live AI (two analysis modes)

### Demo mode — no API key required

Demo mode uses a deterministic requirements-aware engine. It identifies project characteristics and generates repeatable architecture analyses without calling an external AI service.

Use demo mode for:

- Offline faculty demonstrations.
- Reliable presentations without internet dependency.
- Testing every application feature for free.
- Understanding the expected analysis workflow.

The interface labels these results **Demo engine result (no AI used)**. Demo results are not presented as live AI output.

### Live AI mode — optional

Live AI mode sends project requirements to the configured model provider and validates the returned structured data before saving it.

Use live AI mode for:

- Exploring a wider variety of requirements.
- Comparing model-generated alternatives with the deterministic baseline.
- Demonstrating structured AI reasoning and validation.

An API key is **not required to use ASAIP**. It is required only when you choose to enable live generation.

## 3. Recommended provider setup

For this project, the recommended arrangement is **OpenRouter plus demo mode**:

- **OpenRouter** provides access to multiple models through one API key.
- The model can be changed through configuration rather than application code.
- Demo mode remains available when no key is configured.
- Live usage can be controlled through the OpenRouter account and model selection.

A direct Anthropic Claude configuration is also supported for teams that specifically prefer Anthropic.

### Model recommendation

ASAIP defaults to **free OpenRouter models**, so live generation costs $0 with a normal OpenRouter key. The default configuration is:

```text
Primary:   recursive/flint-v1.0:free
Fallbacks: cohere/north-mini-code:free, openrouter/free
```

The primary free model is chosen for strong reasoning and reliable JSON output, with a large token budget so diagrams come back complete. If the primary is rate-limited, temporarily unavailable, or returns empty output, ASAIP automatically tries each fallback model in order — you do not have to change anything. You can override the primary or the fallback chain in `backend/.env` (see below).

Free models are shared and rate-limited, so they can be slower than paid models. A full three-option generation typically takes about **1–2 minutes**; requirements analysis takes roughly 20–40 seconds. The generating screen shows the active model and an elapsed-time counter so you can see it is still working.

For deeper reasoning you can point `OPENROUTER_MODEL` at a higher-capability model available in your account (for example a Claude Sonnet model). Model names, availability, structured-output support, and prices change, so confirm the exact identifier in OpenRouter before using it. Do not choose a model only because it is the largest or most expensive — for this PoC, structured-output reliability, reasoning quality, latency, and cost matter more.

### Configure OpenRouter in PowerShell

Open a PowerShell terminal in the backend directory:

```powershell
cd "C:/AFIF/DA NOTES/sem3/creative int notes/ASAIP/backend"
Copy-Item .env.example .env
notepad .env
```

Set these values in `.env`:

```dotenv
AI_PROVIDER=auto
OPENROUTER_API_KEY=your_actual_openrouter_key
OPENROUTER_MODEL=recursive/flint-v1.0:free
OPENROUTER_FALLBACK_MODELS=cohere/north-mini-code:free,openrouter/free
AI_MAX_TOKENS=16000
```

Save the file and restart the backend. Do not put this key in the frontend, in `VITE_API_URL`, in source code, or in a screenshot submitted with the project.

Provider selection works as follows:

| Setting | Behavior |
|---|---|
| `AI_PROVIDER=auto` | Uses OpenRouter when its key exists, then Anthropic when its key exists, otherwise demo mode. |
| `AI_PROVIDER=openrouter` | Requires an OpenRouter key; a missing key is reported as a configuration error. |
| `AI_PROVIDER=anthropic` | Requires an Anthropic key; a missing key is reported as a configuration error. |
| `AI_PROVIDER=demo` | Always uses the deterministic engine. |

Open **Settings** in ASAIP to check which provider is active.

## 4. Overview

### Purpose

The Overview is the home page and starting point for the main workflows.

### What it shows

- Number of saved projects.
- Number of generated architecture alternatives.
- Average architecture score across saved alternatives.
- Number of completed requirements analyses.
- Recent projects and architecture analyses.
- Actions to start a new project or explore the sample project.

### How it works

The values are calculated from projects returned by the backend. They are not fixed dashboard numbers. Creating or deleting projects changes the statistics.

### How to use it

1. Select **Start a new project** to enter your own requirements.
2. Select **Open the sample project** to inspect a complete example immediately.
3. Select a recent project or architecture to continue previous work.

### Where each page is

The sidebar is grouped as *Your workspace*, *Analysis*, and *Deliverables*:

| Sidebar entry | What this guide calls it |
|---|---|
| Overview | §4 Overview |
| New project | §5 New project (New Architecture Project) |
| My projects | §6 My projects (Your projects) |
| System designs | §7 System designs (Architecture Explorer) |
| Compare options | §8 Compare options (Comparison & Decision Matrix) |
| Design review | §9 Design review (Architecture Critic) |
| Cost estimate | §10 Cost estimate (Cloud Cost Estimator) |
| Growth analysis | §11 Growth analysis (Scalability) |
| Evolution roadmap | §12 Evolution roadmap (Architecture Evolution) |
| Reports and exports | §13 Reports and exports (Reports & Exports) |
| Settings | §14 Settings |

## 5. New project (New Architecture Project)

This module contains the complete requirements-to-architecture workflow.

### Step A: Describe the system

The form groups the inputs under **About the system**, **Load, budget, and team**, **Requirements**, and **Delivery constraints**. Enter the information that should influence architecture decisions:

| Field | What to enter |
|---|---|
| Project name | A recognizable name for the saved workspace. |
| Application domain | E-commerce, Healthcare, FinTech, Education, SaaS, Social Media, IoT, AI/ML, or Custom. |
| Natural-language description | A plain explanation of the system, its users, capabilities, and goals. |
| Target users | The people or systems that will use the product. |
| Expected concurrent users | The number of users active at roughly the same time. |
| Expected daily requests | An approximate daily request volume. |
| Expected future growth | Expected growth in users, traffic, data, or team activity. |
| Availability requirement | The desired service availability target. |
| Budget | The INR budget used for cost-awareness and budget utilisation. |
| Development team size | The number of people available to build and operate the system. |
| Functional requirements | What the system must do. Use sentences, separate lines, or semicolons. |
| Non-functional requirements | Qualities such as security, reliability, performance, maintainability, and scalability. |
| Preferred programming languages | Languages the team knows or prefers. |
| Preferred cloud provider | AWS, Azure, Google Cloud, on-premises, or no preference. |
| Data sensitivity | The impact level associated with exposed or corrupted data. |
| Deployment preference | Cloud, containers, serverless, on-premises, or another operating preference. |

You can select **Fill with a sample** to fill the form without saving anything. Edit any values before continuing.

### Step B: Analyse requirements

Select **Save and analyse requirements**. After a saved project is edited, the same button reads **Save changes and analyse again**.

ASAIP then:

1. Saves the project in SQLite.
2. Separates functional and non-functional requirements.
3. Identifies constraints such as team size, cloud preference, and data sensitivity.
4. Detects missing information.
5. Highlights potential risks.
6. Suggests questions to resolve.
7. Produces a structured summary.

### Step C: Review the analysis

The result is grouped under **What ASAIP understood**, **Constraints we must respect**, **Risks worth planning for**, **Still missing from your brief**, and **Questions to answer with the group**.

- Select **Edit requirements** if an assumption is wrong or incomplete.
- Resolve important unknowns before treating the recommendation as a real engineering decision.
- Continue when the summary represents the intended system.

### Step D: Generate architectures

Select **Generate architectures**.

While it works the page reads **Designing your architecture options** and shows whether the **Live AI** or **Built-in engine** is answering, the active model name, and an elapsed-time counter. With a free live model this usually takes about **1–2 minutes**; the note explains that backup models are tried automatically and that the explorer opens as soon as the options are ready. When it finishes, **Analysis complete** appears and the next step is offered. ASAIP creates three suitable alternatives with different trade-offs. It does not automatically choose microservices. Depending on the project, alternatives can include modular monolith, serverless, event-driven, microservices, layered, or monolithic approaches. With a live provider, each pattern is designed in its own focused model call so the three options are genuinely different rather than one cut-short list.

Each alternative includes:

- Description and architecture pattern.
- Frontend, backend, database, API, authentication, and deployment technologies.
- Infrastructure components.
- Scalability, security, and maintainability strategies.
- Advantages and disadvantages.
- Delivery complexity.
- Initial development and monthly infrastructure estimates.
- Recommended use cases and trade-offs.
- Suitability explanation.
- A project-specific component diagram.
- Scores for the seven decision criteria.

After generation, the application opens **System designs**.

## 6. My projects (Your projects)

### Purpose

**Your projects** lists the saved architecture workspaces.

### Available actions

- **Search:** Find a project by name or content.
- **Open** or **Continue:** Return to a project — **Open** goes to its generated designs, **Continue** takes an unsaved-draft project back to the requirements step.
- **Rename:** The pencil icon opens **Rename this project**; enter a **Project name** and confirm with **Save name**. Saved work is renamed without regenerating architectures.
- **Compare:** Open the project in **Compare options**. Shown only for projects with more than one generated architecture.
- **Delete:** The dialog **Delete this project?** removes the project and its architectures, analyses, and comparisons for good. Confirm with **Delete for good** or back out with **Keep it**.

### How persistence works

Projects, requirements, generated alternatives, comparisons, and completed analyses are stored in the backend SQLite database. Browser storage remembers only interface selections such as the last active project. Clearing browser storage does not replace the backend database.

## 7. System designs (Architecture Explorer)

### Purpose

**System designs** (the Architecture Explorer) helps you understand how each proposed system is assembled.

### Explore alternatives

Use the **Architecture option** selector or the **Option 1 / 2 / 3** cards to switch designs. The diagram and details change to match the selected alternative; the **Project** selector chooses which saved project is open, and **Where this result came from** shows the engine that produced it.

### Read the diagram

The diagram is laid out **left to right** as a layered, industry-style topology. Components are grouped into six labelled, colour-tinted tiers so you can see how a request flows from the user down to the data and back:

| Tier | What lives here |
|---|---|
| Client | End-user devices and client apps. |
| Edge | CDN, load balancers, and API gateways — the front door. |
| Application | Frontend apps, backend services, serverless functions, and workers. |
| Integration | Queues, event buses, and external/third-party systems. |
| Data | Databases, caches, object storage, and search indexes. |
| Operations | Monitoring/observability and secrets management. |

Each component card carries a category **icon and colour** (for example a database cylinder, a queue, a shield for secrets, a gauge for monitoring) plus a project-specific label such as "Amazon Aurora PostgreSQL" or "Order Service". Selecting a card opens its details.

Connections are **typed** so the communication style is visible at a glance, and the legend under the canvas explains both the component categories and the line styles:

- **Request / response** — a solid grey line for synchronous calls.
- **Async event / queue** — a dashed, animated orange line for messages and events.
- **Data read / write** — a dotted green line for storage access.

The same layout, colours, icons, and connection types are reproduced in the SVG, PNG, and PDF exports, so what you see in the explorer is what you deliver.

### Inspect a component

Select any node to open the **Component details** panel (it prompts **Click a component for details** until you do) and shows:

- Component name and category.
- Its responsibility in this particular design.
- The number of direct connections.

### Diagram controls

- Drag the canvas to pan.
- Use zoom controls or the mouse wheel to zoom.
- Use **Fit to screen** to make the complete diagram visible.
- Use **PNG** in the header to save a raster image for documents or slides.
- Use **SVG** in the header to save a scalable vector file.

### Architecture details

Switch the **Architecture details** tab to read what sits behind the diagram. Its sections are:

- **Why this pattern was chosen** and **Best suited for**.
- **Recommended technology stack** — frontend, backend, database, API communication, authentication, and deployment choices.
- **Infrastructure components** with their responsibilities.
- **What works well** and **What to watch out for**.
- **The trade-offs you accept**.
- **Does this fit your project — and why**, the suitability reasoning, plus the **Build cost** and **Monthly infra** figures.

## 8. Compare options (Comparison & Decision Matrix)

### Purpose

This module makes architecture selection explicit and adjustable. It answers: “Which option best matches the priorities of this project?”

### Decision criteria

The weights panel uses plain-language names; the backend field name keeps its original meaning:

| Shown as | Backend criterion | Default weight | Meaning |
|---|---|---:|---|
| Handles growth | Scalability | 20% | Ability to handle increased demand. |
| Protects data | Security | 20% | Strength of security boundaries and controls. |
| Easy to maintain | Maintainability | 15% | Ease of understanding, changing, testing, and operating the system. |
| Runs affordably | Cost Efficiency | 20% | Value relative to delivery and infrastructure cost. |
| Stays available | Reliability | 10% | Fault handling, recovery, and availability characteristics. |
| Stays fast | Performance | 10% | Expected responsiveness and throughput. |
| Easy to build | Development Complexity | 5% | Delivery simplicity; a higher score means lower complexity. |

### Adjust priorities

1. Change a weight using its number field or slider.
2. Ensure the total is exactly **100%**.
3. If necessary, use **Make it total 100** to distribute the current values proportionally.
4. Use the reset icon (**Reset to default priorities**) to restore the original weights.
5. Select **Recalculate ranking**, or **Calculate the ranking** on the first run.

The ranking action stays disabled while the weights do not total 100%. This prevents invalid decision calculations.

### Understand the results

ASAIP calculates:

```text
Weighted Score = Σ (criterion score × criterion weight) / 100
```

The page asks **What matters most to you?**, then returns:

- The winner card, labelled **Ranks highest with your priorities**, showing its score **out of 10**.
- **Overall ranking** — a bar chart of the weighted scores.
- **How each option scores per priority** — the radar chart of criterion profiles.
- **Full score breakdown** — the decision table with **Priority (weight)**, **Final score**, and **Position** for every alternative.
- The explanation of the largest contributions to the winning score.

Changing weights is a what-if sensitivity exercise. If a small weight change reverses the winner, treat the options as closely matched rather than claiming a decisive result.

## 9. Design review (Architecture Critic)

### Purpose

**Design review** (the Architecture Critic) challenges a selected design from a failure-oriented perspective. It is separate from the suitability score: a highly ranked architecture can still have risks that need remediation.

### Run a review

1. Select the project and architecture.
2. Select **Review this architecture**.
3. Wait for the backend review to complete.
4. Select **Run another review** whenever you want to regenerate the findings.

### Understand the risk score

The risk score ranges from **0 to 100**. Higher values indicate more design risk. It is not the same as the weighted architecture score and should not be compared directly with it.

The score is shown as a **Risk out of 100** ring, plus a plain-language rating: **Worth taking seriously before you build** (70+), **Some things to sort out** (40–69), or **Risk looks manageable** (below 40).

### Read findings

Each finding is grouped under the labels the page uses:

- Issue title.
- Critical, High, Medium, or Low severity.
- Affected component.
- **What we found** — the problem in this design.
- **Why it matters** — the consequence if it is left alone.
- **What to do about it** — the recommended fix.
- **What you gain by fixing it** — the expected improvement.

Use severity filters to focus on the most urgent findings.

### Typical findings

The review can identify shared failure domains, database bottlenecks, weak access-control assumptions, missing recovery mechanisms, scalability limits, excessive complexity, observability gaps, and cost concerns.

This is an automated PoC review, not a completed security audit, threat model, penetration test, or compliance certification.

## 10. Cost estimate (Cloud Cost Estimator)

### Purpose

The estimator provides an early INR infrastructure model for AWS, Microsoft Azure, or Google Cloud.

### Calculate costs

1. Select a project and architecture.
2. Select a cloud provider.
3. Select **Estimate cost** for one architecture (**Recalculate** once an estimate exists).
4. Select **Price all options** to compare every alternative using the same provider assumptions.

### Understand the output

- **One-time setup:** Estimated implementation and launch effort.
- **Every month:** Estimated recurring infrastructure cost for the selected provider.
- **Over a year:** Monthly estimate multiplied by twelve.
- **Share of your budget:** Monthly estimate relative to the project budget, labelled as within or above the budget you entered.
- **Where the monthly money goes:** Pie chart of the cost categories.
- **Line by line:** Compute, database, storage, networking, load balancer, cache, API gateway, and monitoring figures with the assumption behind each one.
- **Compare the monthly cost of each option:** Monthly estimates for all generated alternatives that the backend actually priced for that provider.
- **Ways to bring the cost down:** Practical actions such as right-sizing, budgets, lifecycle policies, and cautious use of commitment discounts.

### Important limitation

These are **illustrative estimates based on configurable pricing assumptions**, not live cloud quotes. Region, usage patterns, tax, support, discounts, data transfer, and provider price changes are not fully represented.

## 11. Growth analysis (Scalability)

### Purpose

**Growth analysis** explains how the selected design responds as demand increases.

### Run the analysis

Select a project and architecture, then select **Model growth** (**Run it again** once an analysis exists).

### Scenarios

| Scenario | What it represents |
|---|---|
| Current Load | The entered concurrency and request volume. |
| 5× Growth | Five times the current concurrent-user estimate. |
| 10× Growth | Ten times the current concurrent-user estimate. |

Each scenario card shows the expected users, estimated requests per second, and estimated monthly cost, then explains:

- **What you add to the infrastructure** — the components the design gains at that load.
- **How you scale it** — the scaling strategy.
- **Where it starts to strain** — the likely bottlenecks.
- **Risks to performance** — what could degrade.

The chart compares **Monthly cost** with **Expected users**. Use it to discuss when caching, asynchronous jobs, additional replicas, read scaling, or selective decomposition may become useful.

The request and cost values are capacity-planning assumptions. Real scaling thresholds should be established through representative load tests.

## 12. Evolution roadmap (Architecture Evolution)

### Purpose

**Evolution roadmap** (Architecture Evolution) shows a staged modernization path rather than assuming the most distributed design should be built immediately.

### Generate a roadmap

Select a project and architecture, then select **Build the roadmap**.

### Understand the stages

The roadmap normally progresses through four stages:

1. Establish the production baseline.
2. Add measured caching, queues, and read scaling.
3. Selectively distribute domains that demonstrate independent scaling or release needs.
4. Add advanced resilience, autoscaling, recovery exercises, and operational automation where justified.

Each stage carries a "how hard it is to build" complexity badge and an illustrative `+₹… per month` cost badge, and explains:

- **What changes** — the architecture changes at this stage.
- **What pushes you to do it** — the reasons to evolve.
- **New pieces added** — the components introduced.
- **What you get for it** — the expected benefits.

Later stages are optional decision points, not mandatory destinations. A modular monolith can remain the correct choice for many systems.

## 13. Reports and exports (Reports & Exports)

### Purpose

Reports turn saved analysis into deliverables for reviews, assignments, and presentations.

### PDF report

Select **Download the PDF report**. The backend generates a real PDF from saved project data.

The report contains:

1. Executive Summary
2. Project Overview
3. Functional Requirements
4. Non-Functional Requirements
5. Architecture Alternatives
6. Recommended Architecture
7. Architecture Diagram
8. Technology Stack
9. Weighted Decision Matrix
10. Scalability Analysis
11. Security Analysis
12. Maintainability Analysis
13. Cloud Cost Estimation
14. Architecture Critic Findings
15. Architecture Trade-offs
16. Architecture Evolution Roadmap
17. Conclusion

For the most complete report, run the relevant comparison, critic, cost, scalability, and evolution analyses first.

### JSON export

Select **Export the raw data (JSON)** to download the project and its analysis in a machine-readable format. Use this for backup, further processing, or demonstrating structured outputs.

### Diagram export

Use **PNG image** for a raster image or **SVG vector** for a scalable vector image. These exports represent the selected architecture.

## 14. Settings

### Purpose

Settings shows whether the backend is reachable and which analysis provider is active.

### What to check

- Backend API connection, with **Check again** to re-test it and **See the API reference** to open the FastAPI docs.
- The **Live AI is on** or **Built-in engine only** badge, the selected provider — **OpenRouter**, **Anthropic**, or **Built-in analysis engine (no AI service used)** — and, for a live provider, its model name. A model whose identifier ends in `:free` is tagged **Free model**, and the **Automatic fallback models** list shows the backup free models ASAIP will try if the primary is rate-limited or unavailable.
- **Modes recorded on your saved analyses**: the engine that produced each analysis already stored in this workspace.
- Where the frontend points (`VITE_API_URL`, the local backend address, the dev-server port, and the INR currency used for costs).

If the selected provider has no key, the page says **"The selected AI provider is not ready"** with the exact reason. ASAIP refuses the analysis instead of quietly producing demo output and calling it AI — add the key in the backend environment, or deliberately set `AI_PROVIDER=demo`.

API keys are intentionally not editable in the browser. Configure them only in the backend environment and restart the server after changing them.

## 15. Recommended end-to-end workflow

For a first-time user:

1. Open **New project**.
2. Describe the system in natural language.
3. Add realistic workload, budget, team, security, and growth information.
4. Select **Save and analyse requirements**.
5. Review missing information and edit incorrect assumptions.
6. Select **Generate architectures** to get three alternatives.
7. Inspect each diagram in **System designs** and read the architecture details.
8. Compare alternatives in **Compare options** using the default weights.
9. Change the weights to explore how priorities affect the winner.
10. Run a **Design review** on the recommended option.
11. Use **Cost estimate** to price all alternatives on one provider.
12. Run the **Growth analysis** and **Evolution roadmap** for the same option.
13. Download the PDF, JSON, and selected architecture diagram from **Reports and exports**.

For a reliable faculty demonstration, repeat the same workflow with **Smart E-Commerce Platform** in demo mode before presenting a custom project.

## 16. Troubleshooting

### The interface cannot reach the API

Confirm the backend is running at `http://localhost:8000` and open `http://localhost:8000/api/health`. Restart the backend if necessary.

### A live AI request fails

Check that:

- The selected provider has an API key in `backend/.env`.
- `AI_PROVIDER` names the intended provider.
- The model identifier is available to your account.
- The account has sufficient quota or credits.
- The model can return the requested structured output.

Live provider errors are shown rather than silently relabelled as AI output. With `AI_PROVIDER` explicitly set to `openrouter` or `anthropic` and no key, the backend answers analysis requests with **HTTP 503** and Settings shows **"The selected AI provider is not ready"** — it never falls back to the built-in engine behind your back. For an offline presentation, set `AI_PROVIDER=demo` deliberately.

### Generation is slow or a free model is rate-limited

Free OpenRouter models are shared and can be rate-limited (HTTP 429) or briefly unavailable. This is expected, not a bug:

- ASAIP automatically tries the next model in `OPENROUTER_FALLBACK_MODELS`, so a request usually still succeeds. Watch the elapsed-time counter on the generating screen.
- If every model in the chain is rate-limited at once, wait a minute and retry, or add another free model to the fallback chain in `backend/.env` and restart the backend.
- If a model returns empty or truncated diagrams, raise `AI_MAX_TOKENS` (up to 32,000) so reasoning models have room to finish, then restart.
- For a fast, guaranteed-offline demonstration, set `AI_PROVIDER=demo` deliberately; the deterministic engine produces the same layered diagram style without any network call.

### The comparison will not run

The **Recalculate ranking** button stays disabled until the seven weights total exactly 100%. Use **Make it total 100** to redistribute them proportionally, or the reset icon (**Reset to default priorities**) to restore the original weights.

### A report has incomplete analysis sections

Run the corresponding analysis modules first, then export the report again.

### The frontend does not reflect configuration changes

Backend provider changes require a backend restart. Frontend environment changes require a Vite restart. Refresh the browser after both are running.

## 17. Responsible interpretation

ASAIP provides structured reasoning aids and illustrative estimates. Before using a recommendation in production:

- Validate assumptions with stakeholders.
- Perform threat modeling and compliance review.
- Prototype critical integrations.
- Run load, failure, and recovery tests.
- Obtain current cloud prices.
- Record the final architecture decision and its rationale independently.
