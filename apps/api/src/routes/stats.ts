import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { requireSession } from '../lib/session.js'

export async function statsRoutes(app: FastifyInstance) {
  app.get('/stats', { preHandler: requireSession, schema: { tags: ['stats'], summary: 'Aggregated run metrics for workspace' } }, async (req) => {
    const where = { workspaceId: req.workspaceId! }

    const [total, succeeded, failed, running, queued, agg] = await Promise.all([
      prisma.run.count({ where }),
      prisma.run.count({ where: { ...where, status: 'SUCCESS' } }),
      prisma.run.count({ where: { ...where, status: 'FAILED' } }),
      prisma.run.count({ where: { ...where, status: 'RUNNING' } }),
      prisma.run.count({ where: { ...where, status: 'QUEUED' } }),
      prisma.run.aggregate({ where, _sum: { totalTokens: true, totalCostUsd: true } }),
    ])

    return {
      runs: { total, succeeded, failed, running, queued },
      successRate: total > 0 ? Math.round((succeeded / total) * 100) : 0,
      totalTokens: agg._sum.totalTokens ?? 0,
      totalCostUsd: agg._sum.totalCostUsd ?? 0,
    }
  })
}
