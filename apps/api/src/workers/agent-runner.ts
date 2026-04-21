import { Worker } from 'bullmq'
import { prisma } from '@agentforge/db'
import { redis } from '../lib/redis.js'
import { createPool } from '../lib/message-pool.js'
import type { AgentRunJobData } from '../lib/queue.js'
import type { BaseAgent, LogEvent, UsageEvent } from '../agents/base-agent.js'
import type { MessagePool } from '../lib/message-pool.js'
import { evaluateAlerts } from '../lib/alert-evaluator.js'

function publish(runId: string, event: Record<string, unknown>) {
  redis.publish(`run:${runId}:events`, JSON.stringify(event)).catch(() => {})
}

// Registry — agents registered here in Phase 1.5
const agentRegistry = new Map<string, new (modelOverride?: string, toolGrants?: string[]) => BaseAgent>()

export function registerAgent(role: string, AgentClass: new (modelOverride?: string, toolGrants?: string[]) => BaseAgent) {
  agentRegistry.set(role, AgentClass)
}

async function executeRun(runId: string, pipelineId: string, input: string) {
  // Mark run as RUNNING
  await prisma.run.update({
    where: { id: runId },
    data: { status: 'RUNNING', startedAt: new Date() },
  })
  publish(runId, { type: 'run_start', runId })

  const pipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: pipelineId },
    include: { agentConfigs: { orderBy: { createdAt: 'asc' } } },
  })

  const definition = pipeline.definition as {
    nodes: { id: string; role: string; model: string; name: string }[]
    edges: { source: string; target: string }[]
  }

  // Build ordered node list by following edges from the node with no incoming edges
  const orderedNodes = orderNodes(definition.nodes, definition.edges)

  let pool: MessagePool = createPool(input)
  let totalTokens = 0
  let totalCost = 0

  for (const node of orderedNodes) {
    const AgentClass = agentRegistry.get(node.role)

    // Create RunStep record
    const step = await prisma.runStep.create({
      data: {
        runId,
        agentRole: node.role as never,
        agentName: node.name,
        model: node.model,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })
    publish(runId, { type: 'step_start', stepId: step.id, agentName: node.name, model: node.model })

    if (!AgentClass) {
      // No implementation yet — log a placeholder and skip
      await prisma.log.create({
        data: {
          runStepId: step.id,
          level: 'warn',
          message: `[${node.role}] agent not yet implemented — skipping (Phase 1.5)`,
        },
      })
      await prisma.runStep.update({
        where: { id: step.id },
        data: { status: 'SUCCESS', finishedAt: new Date(), durationMs: 0 },
      })
      continue
    }

    const nodeTools = (node as { tools?: string[] }).tools ?? []
    const agent = new AgentClass(node.model, nodeTools)
    const stepStart = Date.now()

    // Accumulate token usage across all LLM calls within the step
    let inputTokens = 0
    let outputTokens = 0
    let costUsd = 0

    agent.on('log', async (event: LogEvent) => {
      const log = await prisma.log.create({
        data: { runStepId: step.id, level: event.level, message: event.message },
      })
      publish(runId, { type: 'log', stepId: step.id, logId: log.id, level: event.level, message: event.message, timestamp: log.timestamp.toISOString() })
    })

    agent.on('usage', (event: UsageEvent) => {
      inputTokens += event.inputTokens
      outputTokens += event.outputTokens
      costUsd += event.costUsd
    })

    try {
      pool = await agent.execute(pool)

      const durationMs = Date.now() - stepStart
      totalTokens += inputTokens + outputTokens
      totalCost += costUsd

      await prisma.runStep.update({
        where: { id: step.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          durationMs,
          inputTokens,
          outputTokens,
          costUsd,
          output: pool as never,
        },
      })
      publish(runId, { type: 'step_end', stepId: step.id, status: 'SUCCESS', durationMs, inputTokens, outputTokens, costUsd })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await prisma.log.create({
        data: { runStepId: step.id, level: 'error', message: `[${node.role}] error: ${message}` },
      })
      await prisma.runStep.update({
        where: { id: step.id },
        data: { status: 'FAILED', finishedAt: new Date(), durationMs: Date.now() - stepStart },
      })
      publish(runId, { type: 'step_end', stepId: step.id, status: 'FAILED', durationMs: Date.now() - stepStart })
      throw err // bubble up to mark the run as FAILED
    }
  }

  await prisma.run.update({
    where: { id: runId },
    data: { status: 'SUCCESS', finishedAt: new Date(), totalTokens, totalCostUsd: totalCost },
  })
  publish(runId, { type: 'run_end', status: 'SUCCESS', totalTokens, totalCostUsd: totalCost })
  evaluateAlerts(pipeline.workspaceId, runId).catch(() => {})
}

function orderNodes(
  nodes: { id: string; role: string; model: string; name: string }[],
  edges: { source: string; target: string }[],
) {
  const incomingCount = new Map(nodes.map((n) => [n.id, 0]))
  for (const edge of edges) {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)
  }
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    adjacency.get(edge.source)!.push(edge.target)
  }

  const queue = nodes.filter((n) => (incomingCount.get(n.id) ?? 0) === 0)
  const ordered: typeof nodes = []
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  while (queue.length > 0) {
    const current = queue.shift()!
    ordered.push(current)
    for (const nextId of adjacency.get(current.id) ?? []) {
      const count = (incomingCount.get(nextId) ?? 1) - 1
      incomingCount.set(nextId, count)
      if (count === 0) queue.push(nodeById.get(nextId)!)
    }
  }

  return ordered
}

export function createAgentRunWorker() {
  const worker = new Worker<AgentRunJobData>(
    'agent-runs',
    async (job) => {
      const { runId, pipelineId, input } = job.data
      console.log(`[worker] starting run ${runId}`)
      try {
        await executeRun(runId, pipelineId, input)
        console.log(`[worker] run ${runId} succeeded`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const failedRun = await prisma.run.update({
          where: { id: runId },
          data: { status: 'FAILED', finishedAt: new Date() },
        })
        publish(runId, { type: 'run_end', status: 'FAILED' })
        evaluateAlerts(failedRun.workspaceId, runId).catch(() => {})
        console.error(`[worker] run ${runId} failed:`, message)
        throw err
      }
    },
    { connection: redis, concurrency: 5 },
  )

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} permanently failed:`, err.message)
  })

  return worker
}
