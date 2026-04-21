import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from './auth.js'
import { prisma } from '@agentforge/db'

export async function requireSession(req: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: req.headers as unknown as Headers })
  if (!session) {
    reply.status(401).send({ error: 'Unauthorized' })
    return
  }

  // Attach user + first workspace to request
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })

  req.session = session
  req.workspaceId = member?.workspaceId ?? null
}

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    session: Awaited<ReturnType<typeof auth.api.getSession>>
    workspaceId: string | null
  }
}
