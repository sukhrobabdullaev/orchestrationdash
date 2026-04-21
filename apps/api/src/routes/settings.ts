import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { requireSession } from '../lib/session.js'
import { randomBytes } from 'node:crypto'

function generateApiKey() {
  return 'af_' + randomBytes(32).toString('hex')
}

export async function settingsRoutes(app: FastifyInstance) {
  // GET /settings/workspace — current workspace info + api key
  app.get('/settings/workspace', { preHandler: requireSession, schema: { tags: ['settings'], summary: 'Get current workspace info and API key' } }, async (req) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.workspaceId! },
      select: { id: true, name: true, apiKey: true, createdAt: true },
    })
    return workspace
  })

  // PATCH /settings/workspace — update workspace name
  app.patch('/settings/workspace', { preHandler: requireSession, schema: { tags: ['settings'], summary: 'Update workspace name' } }, async (req) => {
    const { name } = req.body as { name: string }
    return prisma.workspace.update({
      where: { id: req.workspaceId! },
      data: { name },
      select: { id: true, name: true, apiKey: true, createdAt: true },
    })
  })

  // POST /settings/workspace/rotate-key — regenerate API key
  app.post('/settings/workspace/rotate-key', { preHandler: requireSession, schema: { tags: ['settings'], summary: 'Rotate API key — invalidates current key immediately' } }, async (req) => {
    const workspace = await prisma.workspace.update({
      where: { id: req.workspaceId! },
      data: { apiKey: generateApiKey() },
      select: { id: true, name: true, apiKey: true },
    })
    return workspace
  })

  // GET /settings/me — current user info
  app.get('/settings/me', { preHandler: requireSession, schema: { tags: ['settings'], summary: 'Get current authenticated user' } }, async (req) => {
    return req.session!.user
  })
}
