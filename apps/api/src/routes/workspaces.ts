import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { requireSession } from '../lib/session.js'

export async function workspaceRoutes(app: FastifyInstance) {
  // GET /workspaces — returns the current user's workspace
  app.get('/workspaces', { preHandler: requireSession }, async (req) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.workspaceId! },
      include: { _count: { select: { pipelines: true, runs: true } } },
    })
    return workspace ? [workspace] : []
  })

  // GET /workspaces/:id
  app.get('/workspaces/:id', { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string }
    if (id !== req.workspaceId) return reply.status(403).send({ error: 'Forbidden' })
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: { _count: { select: { pipelines: true, runs: true } } },
    })
    if (!workspace) return reply.status(404).send({ error: 'workspace not found' })
    return workspace
  })
}
