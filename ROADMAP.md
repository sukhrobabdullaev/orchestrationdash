# AgentForge — AI Agent Orchestration Platform
## Product Roadmap & Technical Specification

> **Vision**: A developer-first platform for building, running, and monitoring multi-agent AI pipelines — with a beautiful real-time dashboard that makes orchestration observable and controllable.

---

## What We're Building

AgentForge is the missing infrastructure layer for AI agent teams. Developers define pipelines (sequences of specialized agents), connect them to LLMs and tools, run them via API or webhooks, and monitor everything in a real-time dashboard.

Think: **Datadog + GitHub Actions + n8n — but for AI agents.**

---

## Tech Stack

### Frontend
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15** (App Router) | SSR + server actions, great for real-time |
| Language | **TypeScript** | Type-safety across agent schemas |
| Styling | **Tailwind CSS v4** | Utility-first, fast iteration |
| UI Components | **shadcn/ui** | Headless, unstyled base — we own the design |
| Charts / Metrics | **Recharts** | Token usage, cost trends, success rates |
| Pipeline Canvas | **React Flow** | Node-based drag-and-drop pipeline builder |
| Real-time | **Server-Sent Events (SSE)** | Log streaming, live run status |
| State | **Zustand** | Lightweight global state for run/pipeline data |
| Fonts | **IBM Plex Mono + Syne** | Terminal + modern — matches the design system |

### Backend
| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Node.js 22 + Fastify** | Fast HTTP + WebSocket support |
| Language | **TypeScript** | Shared types with frontend |
| Task Queue | **BullMQ + Redis** | Agent run queuing, retries, priority |
| Realtime | **Redis Pub/Sub** | Broadcast log events to SSE clients |
| Database | **PostgreSQL + Prisma** | Runs, pipelines, agent configs, cost ledger |
| File storage | **S3-compatible (MinIO local / R2 prod)** | Agent outputs, artifacts |
| Auth | **Better Auth** | Sessions, API keys per workspace |

### AI / Agent Layer
| Layer | Choice | Why |
|-------|--------|-----|
| Multi-LLM router | **Vercel AI SDK** | Unified interface for Anthropic, OpenAI, Groq |
| Agent framework | **Custom (inspired by MetaGPT SOPs)** | Full control over message pool + handoffs |
| Tool runtime | **Sandboxed Node.js** (vm2 / isolated-vm) | Safe code execution by agents |
| Memory | **pgvector** (Postgres extension) | Per-agent long-term memory as embeddings |
| Token tracking | **Custom middleware** | Count + cost every LLM call |

### Infrastructure
| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | **Turborepo** | Shared packages (types, db, ai) |
| Containerization | **Docker + Docker Compose** | Local dev + prod parity |
| Deployment | **Railway / Fly.io** | Simple Postgres + Redis managed |
| CI/CD | **GitHub Actions** | Type-check, lint, test on PR |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Next.js Frontend                │
│  Dashboard · Pipeline Builder · Log Stream       │
└────────────────────┬────────────────────────────┘
                     │ REST + SSE
┌────────────────────▼────────────────────────────┐
│              Fastify API Server                  │
│  /pipelines · /runs · /agents · /webhooks        │
└──────┬──────────────┬───────────────┬────────────┘
       │              │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼───────────┐
│   BullMQ    │ │  Postgres  │ │  Redis Pub/Sub  │
│  Run Queue  │ │  Prisma    │ │  Log Broadcast  │
└──────┬──────┘ └────────────┘ └────────────────┘
       │
┌──────▼───────────────────────────────────────────┐
│              Agent Runner (Worker)                │
│  Loads pipeline → executes agents in sequence    │
│  Writes to shared message pool → streams logs     │
└──────┬───────────────────────────────────────────┘
       │
┌──────▼───────────────────────────────────────────┐
│           LLM Router (Vercel AI SDK)              │
│  Claude Sonnet · GPT-4o · GPT-4o-mini · Groq     │
└──────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
agentforge/
├── apps/
│   ├── web/                    # Next.js dashboard
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── overview/
│   │   │   │   ├── pipelines/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   └── builder/    # React Flow canvas
│   │   │   │   ├── runs/
│   │   │   │   ├── agents/
│   │   │   │   ├── tools/
│   │   │   │   ├── cost/
│   │   │   │   └── settings/
│   │   │   └── api/
│   │   │       └── stream/[runId]/ # SSE log endpoint
│   │   └── components/
│   │       ├── pipeline-canvas/    # React Flow wrapper
│   │       ├── log-stream/         # Live terminal feed
│   │       ├── agent-node/         # Pipeline node cards
│   │       └── charts/             # Token/cost charts
│   │
│   └── api/                    # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── pipelines.ts
│       │   │   ├── runs.ts
│       │   │   ├── agents.ts
│       │   │   └── webhooks.ts
│       │   ├── workers/
│       │   │   └── agent-runner.ts # BullMQ worker
│       │   ├── agents/
│       │   │   ├── base-agent.ts   # Abstract agent class
│       │   │   ├── pm-agent.ts
│       │   │   ├── architect-agent.ts
│       │   │   ├── engineer-agent.ts
│       │   │   └── qa-agent.ts
│       │   └── lib/
│       │       ├── llm-router.ts   # Vercel AI SDK wrapper
│       │       ├── message-pool.ts # Shared agent context
│       │       └── token-tracker.ts
│       └── prisma/
│           └── schema.prisma
│
└── packages/
    ├── types/                  # Shared TS types (Pipeline, Agent, Run)
    ├── db/                     # Prisma client + migrations
    └── ui/                     # Shared design system components
```

---

## Database Schema (Key Models)

```prisma
model Workspace {
  id         String     @id @default(cuid())
  name       String
  apiKey     String     @unique
  pipelines  Pipeline[]
  runs       Run[]
}

model Pipeline {
  id          String   @id @default(cuid())
  name        String
  definition  Json     // Array of AgentNode + edges
  trigger     String   // "webhook" | "schedule" | "manual"
  workspaceId String
  runs        Run[]
}

model AgentConfig {
  id          String  @id @default(cuid())
  role        String  // "pm" | "architect" | "engineer" | "qa" | "custom"
  name        String
  model       String  // "claude-sonnet-4" | "gpt-4o-mini" etc
  systemPrompt String
  tools       String[] // tool names this agent can use
  pipelineId  String
}

model Run {
  id          String    @id @default(cuid())
  pipelineId  String
  status      RunStatus // QUEUED | RUNNING | SUCCESS | FAILED
  trigger     String
  startedAt   DateTime?
  finishedAt  DateTime?
  totalTokens Int       @default(0)
  totalCostUsd Float    @default(0)
  steps       RunStep[]
}

model RunStep {
  id          String   @id @default(cuid())
  runId       String
  agentRole   String
  status      StepStatus
  inputTokens Int
  outputTokens Int
  costUsd     Float
  durationMs  Int?
  output      Json?    // structured agent output
  logs        Log[]
}

model Log {
  id        String   @id @default(cuid())
  runStepId String
  timestamp DateTime @default(now())
  level     String   // "info" | "warn" | "error"
  message   String
}
```

---

## Phase Roadmap

### Phase 1 — Foundation (Weeks 1–3)
**Goal: Working pipeline execution with basic dashboard**

- [ ] Monorepo setup (Turborepo + pnpm workspaces)
- [ ] Postgres + Prisma schema + migrations
- [ ] Redis + BullMQ queue setup
- [ ] Base agent class with Vercel AI SDK integration
- [ ] PM Agent + Architect Agent implemented
- [ ] REST API: POST /runs, GET /runs/:id
- [ ] Next.js dashboard shell (sidebar + topbar)
- [ ] Overview page with static stats
- [ ] Run list page

**Milestone**: Trigger a 2-agent pipeline via curl, see it in the DB.

---

### Phase 2 — Real-time & Observability (Weeks 4–5)
**Goal: Live log streaming + agent status in dashboard**

- [ ] SSE endpoint: GET /api/stream/:runId
- [ ] Redis Pub/Sub log broadcaster in worker
- [ ] Live log stream component (terminal UI)
- [ ] Pipeline canvas — static display of agent nodes
- [ ] Run detail page with step breakdown
- [ ] Token + cost tracking middleware
- [ ] Cost page with Recharts graphs

**Milestone**: Watch a pipeline run live in the dashboard, see logs stream in real-time.

---

### Phase 3 — Pipeline Builder (Weeks 6–8)
**Goal: Visual drag-and-drop pipeline editor**

- [ ] React Flow canvas integration
- [ ] Custom agent node component (role, model, status)
- [ ] Edge rendering (active / waiting / done states)
- [ ] Right-side config panel (system prompt editor, model selector, tool grants)
- [ ] Save pipeline definition to DB as JSON
- [ ] Load pipeline from DB into canvas
- [ ] Webhook trigger configuration UI
- [ ] Schedule trigger (cron) configuration

**Milestone**: Build and save a 4-agent pipeline without touching code.

---

### Phase 4 — Agent Library + Tools (Weeks 9–10)
**Goal: All 5 core agents working + tool system**

- [ ] Engineer Agent (code generation + execution)
- [ ] QA Agent (test running + validation)
- [ ] Deploy Agent (webhook out / Vercel deploy)
- [ ] Tool registry system (web search, file read/write, code exec)
- [ ] Tool grants per agent (security boundary)
- [ ] Message pool inspector in run detail view
- [ ] Agent output viewer (structured JSON)

**Milestone**: Full 5-agent store-generation pipeline runs end-to-end.

---

### Phase 5 — Multi-workspace + Auth + API (Weeks 11–12)
**Goal: Multi-tenant, API-accessible, production-ready**

- [ ] Better Auth integration (email/password + GitHub OAuth)
- [ ] Workspace isolation (all queries scoped to workspace)
- [ ] API key management UI
- [ ] Public API docs (Scalar or Swagger)
- [ ] Alert system (cost threshold, failure rate)
- [ ] Notification webhooks (Slack, email on failure)
- [ ] Rate limiting per workspace
- [ ] Usage dashboard (tokens/day, cost/month)

**Milestone**: Invite a teammate, give them API access, set cost alerts.

---

## Design System (from AgentForge prototype)

```css
/* Colors */
--bg: #09090b          /* page background */
--bg2: #111114         /* sidebar, cards */
--bg3: #18181c         /* hover states */
--accent: #7c6aff      /* purple — primary actions */
--green: #22d3a0       /* running / success */
--amber: #f59e0b       /* warnings / duration */
--red: #f43f5e         /* errors / failures */
--blue: #38bdf8        /* info / model labels */

/* Typography */
--mono: 'IBM Plex Mono'   /* all UI text, code, values */
--sans: 'Syne'            /* headings, stat numbers */
```

The prototype HTML (`agentforge-prototype.html`) contains the full working design.
Convert to React components using shadcn/ui as the base + Tailwind for overrides.
Keep the dark terminal aesthetic — it's the product's identity.

---

## Converting the Prototype to React

The prototype is a single HTML file. Component breakdown for React:

```
Sidebar              → components/layout/Sidebar.tsx
Topbar               → components/layout/Topbar.tsx
StatCard             → components/dashboard/StatCard.tsx
PipelineCanvas       → components/pipeline/PipelineCanvas.tsx  (React Flow)
AgentNode            → components/pipeline/AgentNode.tsx
PipeArrow            → components/pipeline/PipeArrow.tsx
LogStream            → components/runs/LogStream.tsx  (SSE consumer)
AgentList            → components/runs/AgentList.tsx
MiniChart            → components/charts/MiniChart.tsx  (Recharts BarChart)
RunsTable            → components/runs/RunsTable.tsx
StatusPill           → components/ui/StatusPill.tsx
```

The log animation (live appending lines) becomes a `useEffect` that listens
to the SSE stream and appends to a React state array.

The pipeline canvas progress animation becomes React Flow node custom styling
driven by the run's current `stepIndex` from the server.

---

## Environment Variables

```bash
# apps/api/.env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GROQ_API_KEY="gsk_..."

# apps/web/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Getting Started (Local Dev)

```bash
# 1. Clone and install
git clone https://github.com/you/agentforge
cd agentforge
pnpm install

# 2. Start infrastructure
docker-compose up -d  # Postgres + Redis

# 3. Run migrations
pnpm --filter @agentforge/db db:migrate

# 4. Start everything
pnpm dev  # starts web (3000) + api (3001) concurrently

# 5. Trigger a test run
curl -X POST http://localhost:3001/runs \
  -H "Content-Type: application/json" \
  -d '{"pipelineId": "...", "input": "fashion store for streetwear brand"}'
```

---

## Key Technical Decisions

**Why custom agent runner vs MetaGPT/CrewAI?**
Full control over the message pool schema, streaming, cost tracking, and the visual state model that drives the dashboard. External frameworks hide too much internals.

**Why SSE over WebSockets?**
SSE is simpler (works over HTTP/2, no upgrade negotiation), sufficient for one-way log streaming, and native in Next.js App Router.

**Why Vercel AI SDK for LLM routing?**
Single interface for all providers, built-in streaming, token counting, and easy model swapping per agent — crucial for the multi-model cost optimization strategy.

**Why React Flow for the canvas?**
The most mature drag-and-drop graph library for React. Custom node rendering means we keep the exact visual style from the prototype.

---

*AgentForge — build agent teams, not agent spaghetti.*
