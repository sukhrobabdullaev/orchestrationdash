import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from './auth.js'
import { prisma } from '@agentforge/db'

export async function requireSession(req: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: req.headers as unknown as Headers })
  if (!session) {
    // #region agent log
    fetch('http://127.0.0.1:7570/ingest/69b88065-f2d7-475d-86db-a99ded2ad13e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'46580c'},body:JSON.stringify({sessionId:'46580c',runId:'pre-fix',hypothesisId:'H5',location:'api/lib/session.ts:8',message:'requireSession unauthorized',data:{path:req.url,hasCookieHeader:Boolean(req.headers.cookie),hasAuthHeader:Boolean(req.headers.authorization)},timestamp:Date.now()})}).catch(()=>{})
    // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7570/ingest/69b88065-f2d7-475d-86db-a99ded2ad13e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'46580c'},body:JSON.stringify({sessionId:'46580c',runId:'pre-fix',hypothesisId:'H5',location:'api/lib/session.ts:24',message:'requireSession authorized',data:{path:req.url,userId:session.user.id,workspaceId:member?.workspaceId ?? null},timestamp:Date.now()})}).catch(()=>{})
  // #endregion
}

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    session: Awaited<ReturnType<typeof auth.api.getSession>>
    workspaceId: string | null
  }
}
