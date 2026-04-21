import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { requireSession } from '../lib/session.js'

export async function pipelineRoutes(app: FastifyInstance) {
  app.get('/pipelines', {
    preHandler: requireSession,
    schema: { tags: ['pipelines'], summary: 'List pipelines in workspace' },
  }, async (req) => {
    return prisma.pipeline.findMany({
      where: { workspaceId: req.workspaceId! },
      include: { _count: { select: { runs: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/pipelines/:id', {
    preHandler: requireSession,
    schema: { tags: ['pipelines'], summary: 'Get pipeline by ID' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, workspaceId: req.workspaceId! },
      include: { agentConfigs: true, _count: { select: { runs: true } } },
    })
    if (!pipeline) return reply.status(404).send({ error: 'pipeline not found' })
    return pipeline
  })

  app.post('/pipelines', {
    preHandler: requireSession,
    schema: {
      tags: ['pipelines'], summary: 'Create a pipeline',
      body: {
        type: 'object', required: ['name', 'definition'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          definition: { type: 'object' },
          trigger: { type: 'string', enum: ['manual', 'webhook', 'schedule'] },
        },
      },
    },
  }, async (req, reply) => {
    const body = req.body as {
      name: string; description?: string; definition: unknown; trigger?: 'manual' | 'webhook' | 'schedule'
    }
    if (!body.name || !body.definition) return reply.status(400).send({ error: 'name and definition are required' })
    const pipeline = await prisma.pipeline.create({
      data: {
        name: body.name, description: body.description,
        definition: body.definition as never,
        trigger: body.trigger ?? 'manual',
        workspaceId: req.workspaceId!,
      },
    })
    return reply.status(201).send(pipeline)
  })

  app.put('/pipelines/:id', {
    preHandler: requireSession,
    schema: { tags: ['pipelines'], summary: 'Update a pipeline' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { name?: string; description?: string; definition?: unknown; trigger?: 'manual' | 'webhook' | 'schedule' }
    const existing = await prisma.pipeline.findFirst({ where: { id, workspaceId: req.workspaceId! } })
    if (!existing) return reply.status(404).send({ error: 'pipeline not found' })
    const data: Record<string, unknown> = {}
    if (body.name) data['name'] = body.name
    if (body.description !== undefined) data['description'] = body.description
    if (body.definition) data['definition'] = body.definition
    if (body.trigger) data['trigger'] = body.trigger
    return prisma.pipeline.update({ where: { id }, data: data as never })
  })

  app.delete('/pipelines/:id', {
    preHandler: requireSession,
    schema: { tags: ['pipelines'], summary: 'Delete a pipeline' },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.pipeline.findFirst({ where: { id, workspaceId: req.workspaceId! } })
    if (!existing) return reply.status(404).send({ error: 'pipeline not found' })
    await prisma.pipeline.delete({ where: { id } })
    return reply.status(204).send()
  })
}
