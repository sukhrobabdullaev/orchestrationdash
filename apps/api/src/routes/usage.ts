import type { FastifyInstance } from 'fastify'
import { prisma } from '@agentforge/db'
import { requireSession } from '../lib/session.js'

export async function usageRoutes(app: FastifyInstance) {
  // GET /usage — aggregated token + cost data for charts
  app.get('/usage', {
    preHandler: requireSession,
    schema: { tags: ['stats'], summary: 'Token and cost usage over time' },
  }, async (req) => {
    const wid = req.workspaceId!
    const { days = '30' } = req.query as { days?: string }
    const since = new Date(Date.now() - Number(days) * 86_400_000)

    // Raw runs in window
    const runs = await prisma.run.findMany({
      where: { workspaceId: wid, createdAt: { gte: since }, status: 'SUCCESS' },
      select: { createdAt: true, totalTokens: true, totalCostUsd: true, pipelineId: true },
      orderBy: { createdAt: 'asc' },
    })

    // Daily buckets
    const dailyMap = new Map<string, { tokens: number; cost: number; runs: number }>()
    for (const run of runs) {
      const day = run.createdAt.toISOString().slice(0, 10)
      const existing = dailyMap.get(day) ?? { tokens: 0, cost: 0, runs: 0 }
      dailyMap.set(day, {
        tokens: existing.tokens + run.totalTokens,
        cost: existing.cost + run.totalCostUsd,
        runs: existing.runs + 1,
      })
    }
    const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }))

    // Monthly buckets
    const monthlyMap = new Map<string, { tokens: number; cost: number; runs: number }>()
    for (const run of runs) {
      const month = run.createdAt.toISOString().slice(0, 7) // YYYY-MM
      const existing = monthlyMap.get(month) ?? { tokens: 0, cost: 0, runs: 0 }
      monthlyMap.set(month, {
        tokens: existing.tokens + run.totalTokens,
        cost: existing.cost + run.totalCostUsd,
        runs: existing.runs + 1,
      })
    }
    const monthly = Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v }))

    // Per-pipeline totals
    const pipelineMap = new Map<string, { tokens: number; cost: number; runs: number }>()
    for (const run of runs) {
      const existing = pipelineMap.get(run.pipelineId) ?? { tokens: 0, cost: 0, runs: 0 }
      pipelineMap.set(run.pipelineId, {
        tokens: existing.tokens + run.totalTokens,
        cost: existing.cost + run.totalCostUsd,
        runs: existing.runs + 1,
      })
    }

    // Resolve pipeline names
    const pipelineIds = Array.from(pipelineMap.keys())
    const pipelines = pipelineIds.length > 0
      ? await prisma.pipeline.findMany({ where: { id: { in: pipelineIds } }, select: { id: true, name: true } })
      : []
    const nameMap = new Map(pipelines.map(p => [p.id, p.name]))
    const byPipeline = Array.from(pipelineMap.entries())
      .map(([id, v]) => ({ id, name: nameMap.get(id) ?? id.slice(-8), ...v }))
      .sort((a, b) => b.cost - a.cost)

    // Agent-level token breakdown
    const steps = await prisma.runStep.findMany({
      where: { run: { workspaceId: wid, createdAt: { gte: since }, status: 'SUCCESS' } },
      select: { agentRole: true, inputTokens: true, outputTokens: true, costUsd: true },
    })
    const agentMap = new Map<string, { inputTokens: number; outputTokens: number; cost: number; calls: number }>()
    for (const s of steps) {
      const role = s.agentRole as string
      const existing = agentMap.get(role) ?? { inputTokens: 0, outputTokens: 0, cost: 0, calls: 0 }
      agentMap.set(role, {
        inputTokens: existing.inputTokens + s.inputTokens,
        outputTokens: existing.outputTokens + s.outputTokens,
        cost: existing.cost + s.costUsd,
        calls: existing.calls + 1,
      })
    }
    const byAgent = Array.from(agentMap.entries())
      .map(([role, v]) => ({ role, ...v }))
      .sort((a, b) => b.cost - a.cost)

    // Totals
    const totalTokens = runs.reduce((s, r) => s + r.totalTokens, 0)
    const totalCost   = runs.reduce((s, r) => s + r.totalCostUsd, 0)

    return { daily, monthly, byPipeline, byAgent, totalTokens, totalCost, runCount: runs.length }
  })
}
