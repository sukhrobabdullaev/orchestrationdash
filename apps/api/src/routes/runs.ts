import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { agentRunQueue } from '../lib/queue.js'
import { redis } from '../lib/redis.js'
import { requireSession } from '../lib/session.js'

export async function runRoutes(app: FastifyInstance) {
  // GET /runs
  app.get('/runs', { preHandler: requireSession, schema: { tags: ['runs'], summary: 'List runs in workspace' } }, async (req) => {
    const { pipelineId, status, limit = '20', offset = '0' } = req.query as {
      pipelineId?: string
      status?: string
      limit?: string
      offset?: string
    }
    return prisma.run.findMany({
      where: {
        workspaceId: req.workspaceId!,
        ...(pipelineId && { pipelineId }),
        ...(status && { status: status as never }),
      },
      include: {
        pipeline: { select: { name: true } },
        _count: { select: { steps: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 100),
      skip: Number(offset),
    })
  })

  // GET /runs/:id
  app.get('/runs/:id', { preHandler: requireSession, schema: { tags: ['runs'], summary: 'Get run with steps and logs' } }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const run = await prisma.run.findFirst({
      where: { id, workspaceId: req.workspaceId! },
      include: {
        pipeline: { select: { id: true, name: true } },
        steps: {
          include: { logs: { orderBy: { timestamp: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!run) return reply.status(404).send({ error: 'run not found' })
    return run
  })

  // GET /runs/:id/stream — SSE live log stream
  app.get('/runs/:id/stream', { preHandler: requireSession, schema: { tags: ['runs'], summary: 'SSE stream of live run events', description: 'Server-Sent Events stream. Connect with `EventSource`. Replays historical logs then streams live.' } }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const run = await prisma.run.findFirst({
      where: { id, workspaceId: req.workspaceId! },
      select: { id: true, status: true },
    })
    if (!run) return reply.status(404).send({ error: 'run not found' })

    const origin = (req.headers['origin'] as string) ?? 'http://localhost:3000'
    reply.raw.setHeader('Access-Control-Allow-Origin', origin)
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.hijack()
    reply.raw.flushHeaders()

    const send = (data: Record<string, unknown>) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const steps = await prisma.runStep.findMany({
      where: { runId: id },
      include: { logs: { orderBy: { timestamp: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    })
    for (const step of steps) {
      send({ type: 'step_start', stepId: step.id, agentName: step.agentName, model: step.model })
      for (const log of step.logs) {
        send({ type: 'log', stepId: step.id, logId: log.id, level: log.level, message: log.message, timestamp: log.timestamp.toISOString() })
      }
      if (step.status !== 'RUNNING') {
        send({ type: 'step_end', stepId: step.id, status: step.status, durationMs: step.durationMs })
      }
    }

    if (run.status === 'SUCCESS' || run.status === 'FAILED') {
      send({ type: 'run_end', status: run.status })
      reply.raw.end()
      return
    }

    const sub = redis.duplicate()
    await sub.subscribe(`run:${id}:events`)

    sub.on('message', (_channel, message) => {
      try {
        const event = JSON.parse(message) as Record<string, unknown>
        send(event)
        if (event['type'] === 'run_end') {
          sub.quit().catch(() => {})
          reply.raw.end()
        }
      } catch { /* ignore malformed */ }
    })

    req.raw.on('close', () => {
      sub.quit().catch(() => {})
    })

    const ping = setInterval(() => reply.raw.write(': ping\n\n'), 15_000)
    req.raw.on('close', () => clearInterval(ping))
  })

  // POST /runs — trigger a pipeline run
  app.post('/runs', {
    preHandler: requireSession,
    config: { rateLimit: { max: 10, timeWindow: 60_000 } }, // 10 runs/min per workspace
    schema: {
      tags: ['runs'], summary: 'Trigger a pipeline run',
      body: {
        type: 'object', required: ['pipelineId', 'input'],
        properties: {
          pipelineId: { type: 'string' },
          input: { type: 'string', description: 'Natural language task description' },
          trigger: { type: 'string', enum: ['manual', 'webhook'] },
        },
      },
    },
  }, async (req, reply) => {
    const body = req.body as { pipelineId: string; input: string; trigger?: 'manual' | 'webhook' }
    if (!body.pipelineId || !body.input) {
      return reply.status(400).send({ error: 'pipelineId and input are required' })
    }

    const pipeline = await prisma.pipeline.findFirst({
      where: { id: body.pipelineId, workspaceId: req.workspaceId! },
    })
    if (!pipeline) return reply.status(404).send({ error: 'pipeline not found' })

    const run = await prisma.run.create({
      data: {
        pipelineId: pipeline.id,
        workspaceId: pipeline.workspaceId,
        status: 'QUEUED',
        trigger: body.trigger ?? 'manual',
        input: body.input,
      },
    })

    await agentRunQueue.add(
      'agent-run',
      { runId: run.id, pipelineId: pipeline.id, workspaceId: pipeline.workspaceId, input: body.input },
      { jobId: run.id },
    )

    return reply.status(202).send({ runId: run.id, status: 'QUEUED' })
  })
}
