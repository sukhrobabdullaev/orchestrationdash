import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { requireSession } from '../lib/session.js'

export async function alertRoutes(app: FastifyInstance) {
  app.get('/alerts', {
    preHandler: requireSession,
    schema: { tags: ['alerts'], summary: 'List workspace alerts' },
  }, async (req) => {
    return prisma.alert.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/alerts', {
    preHandler: requireSession,
    schema: {
      tags: ['alerts'], summary: 'Create an alert',
      body: {
        type: 'object', required: ['name', 'type', 'threshold'],
        properties: {
          name:            { type: 'string' },
          type:            { type: 'string', enum: ['cost_threshold', 'failure_rate'] },
          threshold:       { type: 'number' },
          windowRuns:      { type: 'integer', default: 20 },
          slackWebhookUrl: { type: 'string' },
          webhookUrl:      { type: 'string' },
          emailTo:         { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const body = req.body as {
      name: string
      type: 'cost_threshold' | 'failure_rate'
      threshold: number
      windowRuns?: number
      slackWebhookUrl?: string
      webhookUrl?: string
      emailTo?: string
    }
    const alert = await prisma.alert.create({
      data: {
        workspaceId: req.workspaceId!,
        name: body.name,
        type: body.type,
        threshold: body.threshold,
        windowRuns: body.windowRuns ?? 20,
        slackWebhookUrl: body.slackWebhookUrl ?? null,
        webhookUrl: body.webhookUrl ?? null,
        emailTo: body.emailTo ?? null,
      },
    })
    return reply.status(201).send(alert)
  })

  app.patch('/alerts/:id', {
    preHandler: requireSession,
    schema: { tags: ['alerts'], summary: 'Update an alert (name, threshold, enabled)' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as {
      name?: string; threshold?: number; windowRuns?: number; enabled?: boolean
      slackWebhookUrl?: string | null; webhookUrl?: string | null; emailTo?: string | null
    }

    const existing = await prisma.alert.findFirst({ where: { id, workspaceId: req.workspaceId! } })
    if (!existing) return reply.status(404).send({ error: 'alert not found' })

    return prisma.alert.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.threshold !== undefined && { threshold: body.threshold }),
        ...(body.windowRuns !== undefined && { windowRuns: body.windowRuns }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.slackWebhookUrl !== undefined && { slackWebhookUrl: body.slackWebhookUrl }),
        ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
        ...(body.emailTo !== undefined && { emailTo: body.emailTo }),
      },
    })
  })

  app.delete('/alerts/:id', {
    preHandler: requireSession,
    schema: { tags: ['alerts'], summary: 'Delete an alert' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.alert.findFirst({ where: { id, workspaceId: req.workspaceId! } })
    if (!existing) return reply.status(404).send({ error: 'alert not found' })
    await prisma.alert.delete({ where: { id } })
    return reply.status(204).send()
  })
}
