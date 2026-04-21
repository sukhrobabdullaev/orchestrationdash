const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export interface Stats {
  runs: { total: number; succeeded: number; failed: number; running: number; queued: number }
  successRate: number
  totalTokens: number
  totalCostUsd: number
}

export interface Run {
  id: string
  pipelineId: string
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  trigger: string
  input: string
  startedAt: string | null
  finishedAt: string | null
  totalTokens: number
  totalCostUsd: number
  createdAt: string
  pipeline?: { name: string }
  _count?: { steps: number }
  steps?: RunStep[]
}

export interface RunStep {
  id: string
  agentRole: string
  agentName: string
  model: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number | null
  startedAt: string | null
  finishedAt: string | null
  output: Record<string, unknown> | null
  logs: { id: string; level: string; message: string; timestamp: string }[]
}

export interface PipelineNode {
  id: string
  name: string
  role: string
  model: string
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
}

export interface Pipeline {
  id: string
  name: string
  description: string | null
  trigger: string
  definition?: { nodes: PipelineNode[]; edges: PipelineEdge[] }
  _count?: { runs: number }
}

export const api = {
  stats: () => apiFetch<Stats>('/stats'),
  runs: (params?: Record<string, string>) => {
    const allowed = ['pipelineId', 'status', 'limit', 'offset']
    const filtered = params
      ? Object.fromEntries(Object.entries(params).filter(([k]) => allowed.includes(k)))
      : {}
    const qs = Object.keys(filtered).length ? '?' + new URLSearchParams(filtered).toString() : ''
    return apiFetch<Run[]>(`/runs${qs}`)
  },
  run: (id: string) => apiFetch<Run>(`/runs/${id}`),
  pipelines: () => apiFetch<Pipeline[]>('/pipelines'),
  pipeline: (id: string) => apiFetch<Pipeline>(`/pipelines/${id}`),
}
