import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { agentRunQueue } from '../lib/queue.js'

export async function webhookRoutes(app: FastifyInstance) {
  // POST /webhooks/:pipelineId — external trigger
  app.post('/webhooks/:pipelineId', async (req, reply) => {
    const { pipelineId } = req.params as { pipelineId: string }
    const body = req.body as { input?: string } | null

    const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline) return reply.status(404).send({ error: 'pipeline not found' })
    if (pipeline.trigger !== 'webhook') {
      return reply.status(400).send({ error: 'pipeline trigger is not webhook' })
    }

    const input = body?.input ?? `webhook trigger · ${new Date().toISOString()}`

    const run = await prisma.run.create({
      data: {
        pipelineId: pipeline.id,
        workspaceId: pipeline.workspaceId,
        status: 'QUEUED',
        trigger: 'webhook',
        input,
      },
    })

    await agentRunQueue.add(
      'agent-run',
      { runId: run.id, pipelineId: pipeline.id, workspaceId: pipeline.workspaceId, input },
      { jobId: run.id },
    )

    return reply.status(202).send({ runId: run.id, status: 'QUEUED' })
  })
}
