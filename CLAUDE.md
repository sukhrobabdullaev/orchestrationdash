# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentForge** is a developer platform for orchestrating multi-agent AI pipelines with a real-time dashboard. Think: "Datadog + GitHub Actions + n8n — but for AI agents." This repository is currently in the **design/spec phase** — the monorepo scaffold (apps/, packages/) has not been created yet. Key artifacts present are `PROJECT.md` (developer guide), `ROADMAP.md` (technical spec), and `agentforge-prototype.html` (interactive UI prototype).

## Planned Commands (once monorepo is scaffolded)

```bash
# Dev servers (pnpm workspaces + Turborepo)
pnpm dev                    # web (port 3000) + api (port 3001) concurrently
pnpm --filter web dev       # web only
pnpm --filter api dev       # api only

# Infrastructure
docker-compose up -d        # start Postgres + Redis

# Database
pnpm db:migrate             # apply pending Prisma migrations
pnpm db:studio              # open Prisma Studio

# Quality
pnpm lint                   # ESLint across all packages
pnpm typecheck              # tsc --noEmit
pnpm test                   # Vitest
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Canvas | React Flow (drag-and-drop pipeline builder) |
| Charts | Recharts (token usage, cost, success rates) |
| Real-time (client) | Server-Sent Events (SSE) |
| State | Zustand |
| Backend | Fastify + Node.js 22, TypeScript |
| Queue | BullMQ + Redis |
| Database | PostgreSQL + Prisma ORM + pgvector (embeddings) |
| LLM routing | Vercel AI SDK (Claude Sonnet, GPT-4o, Groq unified interface) |
| Auth | Better Auth (email/password + GitHub OAuth) |
| Fonts | IBM Plex Mono (all UI text) + Syne (headings) |

## Planned Monorepo Structure

```
agentforge/
├── apps/
│   ├── web/                    # Next.js dashboard
│   │   ├── app/(dashboard)/
│   │   │   ├── overview/
│   │   │   ├── pipelines/[id]/
│   │   │   ├── builder/        # React Flow canvas
│   │   │   ├── runs/[id]/      # Live log stream
│   │   │   ├── cost/           # Cost dashboard
│   │   │   └── settings/
│   │   └── api/stream/[runId]/ # SSE endpoint
│   └── api/                    # Fastify backend
│       └── src/
│           ├── routes/         # pipelines, runs, agents, webhooks
│           ├── workers/agent-runner.ts   # BullMQ worker (core)
│           ├── agents/         # base-agent.ts + pm/architect/engineer/qa
│           └── lib/            # llm-router.ts, message-pool.ts, token-tracker.ts
└── packages/
    ├── types/                  # Shared TS types (Pipeline, Agent, Run)
    ├── db/                     # Prisma client + migrations
    └── ui/                     # Design system components
```

## Core Concepts

| Term | Definition |
|------|-----------|
| **Pipeline** | JSON definition of ordered agent nodes + edges, stored in DB |
| **Agent** | LLM role with system prompt, model config, and tool grants |
| **Run** | One execution of a pipeline; has steps, logs, token counts, cost |
| **Message Pool** | Plain JSON passed between agents (PM's PRD → Architect, etc.) |
| **Log** | Individual lines emitted during a step, broadcast via Redis Pub/Sub |

## Execution Flow

1. Frontend `POST /runs` with pipelineId + input
2. API creates Run record + enqueues BullMQ job
3. Worker loads pipeline, initializes message pool, runs agents sequentially
4. Each agent: reads pool → calls LLM via `llm-router.ts` → emits logs via Redis → writes output back to pool
5. Redis Pub/Sub broadcasts logs → SSE → `LogStream.tsx` renders live terminal

## Key Rules

- **All LLM calls must go through `llm-router.ts`** (Vercel AI SDK wrapper) — never call provider SDKs directly
- **Never edit Prisma schema directly** — create a migration file and run `pnpm db:migrate`
- **One agent task at a time** — agents are sequential within a pipeline run
- **Extend `BaseAgent`** when creating new agent types; never duplicate the LLM call pattern

## Agent Implementation Pattern

```typescript
// apps/api/src/agents/pm-agent.ts
export class PMAgent extends BaseAgent {
  role = 'pm' as const
  defaultModel = 'claude-sonnet-4-5'

  async execute(messagePool: MessagePool): Promise<MessagePool> {
    const result = await this.llm.generate(this.buildPrompt(messagePool.input))
    this.emit('log', `Generated PRD · ${result.usage.totalTokens} tokens`)
    return { ...messagePool, prd: result.text }
  }
}
```

## API Endpoints

```
POST   /pipelines              Create pipeline
GET    /pipelines/:id          Get pipeline + definition
POST   /runs                   Trigger a run
GET    /runs/:id               Get run + steps + logs
GET    /runs/:id/stream        SSE: stream live logs
POST   /webhooks/:pipelineId   External webhook trigger
```

## Design System

- Dark terminal aesthetic — primary background `#0a0a0f`, accent purple `#7c3aed`
- All UI text: `IBM Plex Mono`; headings: `Syne`
- See `agentforge-prototype.html` for the full visual reference and color token definitions
