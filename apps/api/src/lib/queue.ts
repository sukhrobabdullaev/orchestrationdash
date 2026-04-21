import { Queue } from 'bullmq'
import { redis } from './redis.js'

export interface AgentRunJobData {
  runId: string
  pipelineId: string
  workspaceId: string
  input: string
}

export const agentRunQueue = new Queue<AgentRunJobData>('agent-runs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
})
