import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import scalarPlugin from '@scalar/fastify-api-reference'
import rateLimit from '@fastify/rate-limit'
import { redis } from './lib/redis.js'
import { agentRunQueue } from './lib/queue.js'
import { createAgentRunWorker, registerAgent } from './workers/agent-runner.js'
import { PMAgent } from './agents/pm-agent.js'
import { ArchitectAgent } from './agents/architect-agent.js'
import { EngineerAgent } from './agents/engineer-agent.js'
import { QAAgent } from './agents/qa-agent.js'
import { DeployAgent } from './agents/deploy-agent.js'
import { pipelineRoutes } from './routes/pipelines.js'
import { runRoutes } from './routes/runs.js'
import { workspaceRoutes } from './routes/workspaces.js'
import { statsRoutes } from './routes/stats.js'
import { webhookRoutes } from './routes/webhooks.js'
import { authRoutes } from './routes/auth.js'
import { settingsRoutes } from './routes/settings.js'
import { alertRoutes } from './routes/alerts.js'
import { usageRoutes } from './routes/usage.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  credentials: true,
})

// ── Rate limiting ─────────────────────────────────────────────────────────────
await app.register(rateLimit, {
  global: true,
  max: 120,           // 120 req/min per workspace by default
  timeWindow: 60_000,
  keyGenerator: (req) => {
    // scope by workspaceId when available, fall back to IP
    return (req as unknown as { workspaceId?: string }).workspaceId ?? req.ip
  },
  errorResponseBuilder: () => ({
    error: 'Too Many Requests',
    message: 'Rate limit exceeded — max 120 requests per minute per workspace',
    statusCode: 429,
  }),
})

// ── OpenAPI / Scalar docs ─────────────────────────────────────────────────────
await app.register(swagger, {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'AgentForge API',
      description: 'REST API for orchestrating multi-agent AI pipelines. Authenticate with a session cookie (browser) or `X-API-Key` header (external).',
      version: '0.1.0',
    },
    servers: [{ url: 'http://localhost:3001', description: 'Local dev' }],
    components: {
      securitySchemes: {
        sessionCookie: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
    security: [{ sessionCookie: [] }, { apiKey: [] }],
    tags: [
      { name: 'auth',      description: 'Sign up, sign in, sign out' },
      { name: 'pipelines', description: 'Create and manage pipelines' },
      { name: 'runs',      description: 'Trigger and monitor pipeline runs' },
      { name: 'settings',  description: 'Workspace and API key management' },
      { name: 'stats',     description: 'Aggregated usage metrics' },
      { name: 'webhooks',  description: 'Inbound webhook triggers' },
    ],
  },
})

await app.register(scalarPlugin, {
  routePrefix: '/docs',
  configuration: {
    theme: 'purple',
    title: 'AgentForge API Reference',
    darkMode: true,
  },
})

// ── Routes ───────────────────────────────────────────────────────────────────
await app.register(authRoutes)
await app.register(settingsRoutes)
await app.register(alertRoutes)
await app.register(usageRoutes)
await app.register(workspaceRoutes)
await app.register(pipelineRoutes)
await app.register(runRoutes)
await app.register(statsRoutes)
await app.register(webhookRoutes)

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', async () => ({
  ok: true,
  redis: redis.status === 'ready' ? 'ok' : redis.status,
  queue: agentRunQueue.name,
}))

// ── Agent registry ───────────────────────────────────────────────────────────
registerAgent('pm', PMAgent)
registerAgent('architect', ArchitectAgent)
registerAgent('engineer', EngineerAgent)
registerAgent('qa', QAAgent)
registerAgent('deploy', DeployAgent)

// ── Worker ───────────────────────────────────────────────────────────────────
const worker = createAgentRunWorker()

// ── Shutdown ─────────────────────────────────────────────────────────────────
const shutdown = async () => {
  app.log.info('shutting down...')
  await worker.close()
  await agentRunQueue.close()
  await redis.quit()
  await app.close()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// ── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env['PORT'] ?? 3001)
await app.listen({ port, host: '0.0.0.0' })
