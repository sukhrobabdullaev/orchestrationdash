# AgentForge — Claude Code Context

> Read this first. It tells you what this project is, how it's structured,
> and how to work on it without breaking things.

## What Is This

AgentForge is a developer platform for building and monitoring multi-agent AI pipelines.
A user defines a pipeline (e.g. PM Agent → Architect Agent → Engineer Agent → QA Agent),
triggers it via webhook or UI, and watches it execute in real-time on a dashboard.

This is NOT a no-code tool. It's for developers.

## Monorepo Layout

```
agentforge/
├── apps/
│   ├── web/          Next.js 15 (App Router) — the dashboard UI
│   └── api/          Fastify — REST API + BullMQ worker
└── packages/
    ├── types/        Shared TypeScript types (Pipeline, Run, Agent, Log)
    ├── db/           Prisma client + schema + migrations
    └── ui/           Shared design system components
```

## Design System

The visual language is defined in `agentforge-prototype.html`.
Dark terminal aesthetic. IBM Plex Mono for all UI text. Syne for headings.
DO NOT change fonts, color tokens, or border styles without explicit instruction.

Color tokens (use CSS variables, not hardcoded hex):
- `--bg`: page background (#09090b)
- `--bg2`: sidebar/cards (#111114)
- `--accent`: purple actions (#7c6aff)
- `--green`: running/success (#22d3a0)
- `--amber`: warnings (#f59e0b)
- `--red`: errors (#f43f5e)

## Core Concepts

**Pipeline**: JSON definition of ordered agent nodes + edges.
Stored in DB. Loaded by the runner at execution time.

**Agent**: A configured LLM role with a system prompt, model, and tool grants.
Agents communicate via the **message pool** (shared context object passed between steps).

**Run**: One execution of a pipeline. Has steps (one per agent), logs, token counts, cost.

**Message Pool**: A plain JSON object that each agent can read from and write to.
It's how the PM Agent's PRD gets passed to the Architect, etc.

**Log**: Individual log lines emitted during a run step. Streamed via SSE to the dashboard.

## Key Files to Know

| File | Purpose |
|------|---------|
| `packages/types/index.ts` | All shared types — read before creating new ones |
| `packages/db/schema.prisma` | Database schema — migrate after changes |
| `apps/api/src/agents/base-agent.ts` | Abstract agent class — extend for new agents |
| `apps/api/src/workers/agent-runner.ts` | Executes pipeline steps, emits logs |
| `apps/api/src/lib/llm-router.ts` | Vercel AI SDK wrapper — all LLM calls go here |
| `apps/web/app/(dashboard)/` | All dashboard pages |
| `apps/web/components/pipeline/` | React Flow pipeline canvas components |
| `apps/web/components/runs/LogStream.tsx` | SSE consumer + live terminal UI |

## Rules for Claude Code

1. **One task at a time.** Complete the current task fully before starting the next.
2. **Never modify `schema.prisma` without running a migration** (`pnpm db:migrate`).
3. **All LLM calls go through `llm-router.ts`** — never call Anthropic/OpenAI SDK directly.
4. **Every agent must extend `BaseAgent`** — never instantiate an LLM inline in a route.
5. **Logs must go through the log emitter** — never console.log in agent code.
6. **UI components match the design system** — no Tailwind colors outside the token set.
7. **SSE is one-way** — dashboard reads, it never writes back via the stream.
8. **Tests live next to the file** — `agent-runner.test.ts` beside `agent-runner.ts`.

## Development Commands

```bash
pnpm dev              # start web + api concurrently
pnpm --filter web dev # web only (port 3000)
pnpm --filter api dev # api only (port 3001)
pnpm db:migrate       # run pending migrations
pnpm db:studio        # open Prisma Studio
pnpm lint             # eslint across all packages
pnpm typecheck        # tsc --noEmit across all packages
pnpm test             # vitest
```

## Agent Implementation Pattern

```typescript
// apps/api/src/agents/pm-agent.ts
import { BaseAgent } from './base-agent'

export class PMAgent extends BaseAgent {
  role = 'pm' as const
  defaultModel = 'claude-sonnet-4-5'

  async execute(messagePool: MessagePool): Promise<MessagePool> {
    const prompt = this.buildPrompt(messagePool.input)
    const result = await this.llm.generate(prompt)
    this.emit('log', `Generated PRD · ${result.usage.totalTokens} tokens`)
    return {
      ...messagePool,
      prd: result.text,
      userStories: this.parsePRD(result.text),
    }
  }
}
```

## API Endpoints

```
POST /pipelines          Create pipeline
GET  /pipelines          List pipelines
GET  /pipelines/:id      Get pipeline + definition
PUT  /pipelines/:id      Update pipeline

POST /runs               Trigger a run
GET  /runs               List runs (with filters)
GET  /runs/:id           Get run + steps + logs
GET  /runs/:id/stream    SSE: stream live logs (text/event-stream)

POST /webhooks/:pipelineId   External webhook trigger
```

## Environment Variables Required

```bash
# apps/api/.env
DATABASE_URL=
REDIS_URL=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=          # optional
JWT_SECRET=

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```
