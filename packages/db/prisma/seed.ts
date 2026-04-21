import process from 'node:process'
import { PrismaClient, Prisma } from '../generated/client/index.js'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env['DATABASE_URL'] } },
})

async function main() {
  console.log('🌱 seeding database...')

  // ── Workspace ──────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { apiKey: 'seed-api-key-dev-001' },
    update: {},
    create: {
      name: 'Dev Workspace',
      apiKey: 'seed-api-key-dev-001',
    },
  })
  console.log(`✓ workspace: ${workspace.name} (${workspace.id})`)

  // ── Pipeline ───────────────────────────────────────────────────────────────
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'seed-pipeline-001' },
    update: {
      definition: {
        nodes: [
          { id: 'node-pm', role: 'pm', name: 'PM Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a product manager. Write a detailed PRD.', tools: [] },
          { id: 'node-arch', role: 'architect', name: 'Architect Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a software architect. Design the system based on the PRD.', tools: [] },
          { id: 'node-eng', role: 'engineer', name: 'Engineer Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a senior engineer. Implement the design.', tools: [] },
          { id: 'node-qa', role: 'qa', name: 'QA Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a QA engineer. Write tests and validate the implementation.', tools: [] },
        ],
        edges: [
          { id: 'e1', source: 'node-pm', target: 'node-arch' },
          { id: 'e2', source: 'node-arch', target: 'node-eng' },
          { id: 'e3', source: 'node-eng', target: 'node-qa' },
        ],
      },
    },
    create: {
      id: 'seed-pipeline-001',
      name: 'Store Generator',
      description: 'PM → Architect → Engineer → QA — generates a full e-commerce store',
      trigger: 'manual',
      workspaceId: workspace.id,
      definition: {
        nodes: [
          { id: 'node-pm', role: 'pm', name: 'PM Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a product manager. Write a detailed PRD.', tools: [] },
          { id: 'node-arch', role: 'architect', name: 'Architect Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a software architect. Design the system based on the PRD.', tools: [] },
          { id: 'node-eng', role: 'engineer', name: 'Engineer Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a senior engineer. Implement the design.', tools: [] },
          { id: 'node-qa', role: 'qa', name: 'QA Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a QA engineer. Write tests and validate the implementation.', tools: [] },
        ],
        edges: [
          { id: 'e1', source: 'node-pm', target: 'node-arch' },
          { id: 'e2', source: 'node-arch', target: 'node-eng' },
          { id: 'e3', source: 'node-eng', target: 'node-qa' },
        ],
      },
    },
  })
  console.log(`✓ pipeline: ${pipeline.name} (${pipeline.id})`)

  // ── Agent Configs ──────────────────────────────────────────────────────────
  const agentDefs = [
    { role: 'pm' as const, name: 'PM Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a product manager. Write a detailed PRD.' },
    { role: 'architect' as const, name: 'Architect Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a software architect. Design the system based on the PRD.' },
    { role: 'engineer' as const, name: 'Engineer Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a senior engineer. Implement the design.' },
    { role: 'qa' as const, name: 'QA Agent', model: 'gpt-4o-mini', systemPrompt: 'You are a QA engineer. Write tests and validate the implementation.' },
  ]

  for (const def of agentDefs) {
    await prisma.agentConfig.upsert({
      where: { id: `seed-agent-${def.role}` },
      update: {},
      create: { id: `seed-agent-${def.role}`, ...def, pipelineId: pipeline.id },
    })
  }
  console.log(`✓ agent configs: ${agentDefs.map((a) => a.role).join(', ')}`)

  // ── Runs with steps and logs ───────────────────────────────────────────────
  const runDefs = [
    { status: 'SUCCESS' as const, input: 'fashion store for streetwear brand', durationMs: 42000, tokens: 18400, cost: 0.29 },
    { status: 'FAILED' as const, input: 'marketplace for vintage furniture', durationMs: 12000, tokens: 5200, cost: 0.08 },
    { status: 'RUNNING' as const, input: 'subscription box for coffee lovers', durationMs: 0, tokens: 3100, cost: 0.05 },
  ]

  for (const [i, def] of runDefs.entries()) {
    const runId = `seed-run-00${i + 1}`
    const startedAt = new Date(Date.now() - (3 - i) * 60 * 60 * 1000)
    const finishedAt = def.status !== 'RUNNING' ? new Date(startedAt.getTime() + def.durationMs) : null

    const run = await prisma.run.upsert({
      where: { id: runId },
      update: {},
      create: {
        id: runId,
        pipelineId: pipeline.id,
        workspaceId: workspace.id,
        status: def.status,
        trigger: 'manual',
        input: def.input,
        startedAt,
        finishedAt,
        totalTokens: def.tokens,
        totalCostUsd: def.cost,
      },
    })

    // Steps for the run
    const stepStatuses = {
      SUCCESS: ['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS'] as const,
      FAILED: ['SUCCESS', 'FAILED', 'PENDING', 'PENDING'] as const,
      RUNNING: ['SUCCESS', 'RUNNING', 'PENDING', 'PENDING'] as const,
    }

    const statuses = stepStatuses[def.status]
    for (const [j, agent] of agentDefs.entries()) {
      const stepId = `seed-step-${i + 1}-${j + 1}`
      const stepStatus = statuses[j] ?? 'PENDING'
      const stepTokens = stepStatus !== 'PENDING' ? Math.floor(def.tokens / 4) : 0
      const stepCost = stepStatus !== 'PENDING' ? def.cost / 4 : 0

      const step = await prisma.runStep.upsert({
        where: { id: stepId },
        update: {},
        create: {
          id: stepId,
          runId: run.id,
          agentRole: agent.role,
          agentName: agent.name,
          model: agent.model,
          status: stepStatus,
          inputTokens: Math.floor(stepTokens * 0.6),
          outputTokens: Math.floor(stepTokens * 0.4),
          costUsd: stepCost,
          durationMs: stepStatus === 'SUCCESS' ? Math.floor(def.durationMs / 4) : null,
          startedAt: stepStatus !== 'PENDING' ? new Date(startedAt.getTime() + j * 10000) : null,
          finishedAt: stepStatus === 'SUCCESS' ? new Date(startedAt.getTime() + j * 10000 + Math.floor(def.durationMs / 4)) : null,
          output: stepStatus === 'SUCCESS' ? { summary: `${agent.role} completed successfully` } : Prisma.JsonNull,
        },
      })

      // Logs for completed/running steps
      if (stepStatus !== 'PENDING') {
        const logLines = [
          { level: 'info' as const, message: `[${agent.role}] starting — model: ${agent.model}` },
          { level: 'info' as const, message: `[${agent.role}] sending prompt (${Math.floor(stepTokens * 0.6)} input tokens)` },
          ...(stepStatus === 'SUCCESS' ? [
            { level: 'info' as const, message: `[${agent.role}] response received (${Math.floor(stepTokens * 0.4)} output tokens)` },
            { level: 'info' as const, message: `[${agent.role}] wrote output to message pool` },
          ] : [
            { level: 'error' as const, message: `[${agent.role}] LLM call failed: rate limit exceeded` },
          ]),
        ]

        for (const [k, log] of logLines.entries()) {
          await prisma.log.upsert({
            where: { id: `seed-log-${i + 1}-${j + 1}-${k + 1}` },
            update: {},
            create: {
              id: `seed-log-${i + 1}-${j + 1}-${k + 1}`,
              runStepId: step.id,
              level: log.level,
              message: log.message,
              timestamp: new Date(startedAt.getTime() + j * 10000 + k * 2000),
            },
          })
        }
      }
    }

    console.log(`✓ run #${i + 1}: "${def.input}" → ${def.status}`)
  }

  console.log('\n✅ seed complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
