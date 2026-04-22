import { cookies } from 'next/headers'
import type { Stats, Run, Pipeline } from './api'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function apiFetchServer<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { Cookie: cookieHeader }),
      ...init?.headers,
    },
    cache: 'no-store',
  })
  
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export const apiServer = {
  stats: () => apiFetchServer<Stats>('/stats'),
  runs: (params?: Record<string, string>) => {
    const allowed = ['pipelineId', 'status', 'limit', 'offset']
    const filtered = params
      ? Object.fromEntries(Object.entries(params).filter(([k]) => allowed.includes(k)))
      : {}
    const qs = Object.keys(filtered).length ? '?' + new URLSearchParams(filtered).toString() : ''
    return apiFetchServer<Run[]>(`/runs${qs}`)
  },
  run: (id: string) => apiFetchServer<Run>(`/runs/${id}`),
  pipelines: () => apiFetchServer<Pipeline[]>('/pipelines'),
  pipeline: (id: string) => apiFetchServer<Pipeline>(`/pipelines/${id}`),
}
