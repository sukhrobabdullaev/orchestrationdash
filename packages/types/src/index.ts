// Shared TypeScript types — populated in Phase 1.2+

export type RunStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED'
export type StepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
export type TriggerType = 'manual' | 'webhook' | 'schedule'
export type AgentRole = 'pm' | 'architect' | 'engineer' | 'qa' | 'deploy' | 'custom'
export type LogLevel = 'info' | 'warn' | 'error'

export interface Pipeline {
  id: string
  name: string
  definition: PipelineDefinition
  trigger: TriggerType
  workspaceId: string
}

export interface PipelineDefinition {
  nodes: AgentNode[]
  edges: PipelineEdge[]
}

export interface AgentNode {
  id: string
  role: AgentRole
  name: string
  model: string
  systemPrompt: string
  tools: string[]
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
}

export interface Run {
  id: string
  pipelineId: string
  status: RunStatus
  trigger: TriggerType
  startedAt?: string
  finishedAt?: string
  totalTokens: number
  totalCostUsd: number
  steps: RunStep[]
}

export interface RunStep {
  id: string
  runId: string
  agentRole: AgentRole
  status: StepStatus
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs?: number
  output?: Record<string, unknown>
  logs: Log[]
}

export interface Log {
  id: string
  runStepId: string
  timestamp: string
  level: LogLevel
  message: string
}

export interface MessagePool {
  input: string
  [key: string]: unknown
}
