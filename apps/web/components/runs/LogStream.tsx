'use client'

import { useEffect, useRef, useState } from 'react'

type LogLine = {
  id: string
  stepId: string
  level: string
  message: string
  timestamp: string
}

type StepMeta = {
  stepId: string
  agentName: string
  model: string
  status?: string
  durationMs?: number | null
}

type RunEndEvent = { type: 'run_end'; status: string }

export function LogStream({ runId, apiUrl }: { runId: string; apiUrl: string }) {
  const [steps, setSteps] = useState<Map<string, StepMeta>>(new Map())
  const [logs, setLogs] = useState<LogLine[]>([])
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = new EventSource(`${apiUrl}/runs/${runId}/stream`)

    es.onmessage = (e: MessageEvent) => {
      const event = JSON.parse(e.data as string) as Record<string, unknown>

      if (event['type'] === 'step_start') {
        setSteps(prev => {
          const next = new Map(prev)
          next.set(event['stepId'] as string, {
            stepId: event['stepId'] as string,
            agentName: event['agentName'] as string,
            model: event['model'] as string,
          })
          return next
        })
      } else if (event['type'] === 'step_end') {
        setSteps(prev => {
          const next = new Map(prev)
          const existing = next.get(event['stepId'] as string)
          if (existing) next.set(event['stepId'] as string, { ...existing, status: event['status'] as string, durationMs: event['durationMs'] as number | null })
          return next
        })
      } else if (event['type'] === 'log') {
        setLogs(prev => [...prev, {
          id: event['logId'] as string,
          stepId: event['stepId'] as string,
          level: event['level'] as string,
          message: event['message'] as string,
          timestamp: event['timestamp'] as string,
        }])
      } else if (event['type'] === 'run_end') {
        setRunStatus((event as unknown as RunEndEvent).status)
        es.close()
      }
    }

    es.onerror = () => es.close()

    return () => es.close()
  }, [runId, apiUrl])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const stepOrder = Array.from(steps.values())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {stepOrder.map((step, i) => {
        const stepLogs = logs.filter(l => l.stepId === step.stepId)
        const statusColor = step.status === 'SUCCESS' ? '#22d3a0' : step.status === 'FAILED' ? '#f43f5e' : '#f59e0b'

        return (
          <div key={step.stepId} style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1c1c1f', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#18181c', border: '1px solid #27272a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#52525b', flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>{step.agentName}</div>
                <div style={{ fontSize: '11px', color: '#52525b' }}>{step.model}</div>
              </div>
              <div style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                background: `${statusColor}18`, color: statusColor,
                border: `1px solid ${statusColor}40`,
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                {!step.status && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                )}
                {step.status ?? 'RUNNING'}
              </div>
              {step.durationMs != null && (
                <div style={{ fontSize: '11px', color: '#52525b' }}>{(step.durationMs / 1000).toFixed(1)}s</div>
              )}
            </div>
            {stepLogs.length > 0 && (
              <div style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {stepLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#3f3f46', flexShrink: 0 }}>
                      {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
                    </span>
                    <span style={{
                      color: log.level === 'error' ? '#f43f5e' : log.level === 'warn' ? '#f59e0b' : '#22d3a0',
                      flexShrink: 0, width: '36px',
                    }}>{log.level}</span>
                    <span style={{ color: '#a1a1aa' }}>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {runStatus && (
        <div style={{
          padding: '10px 16px', borderRadius: '6px', fontSize: '12px',
          background: runStatus === 'SUCCESS' ? '#22d3a018' : '#f43f5e18',
          color: runStatus === 'SUCCESS' ? '#22d3a0' : '#f43f5e',
          border: `1px solid ${runStatus === 'SUCCESS' ? '#22d3a040' : '#f43f5e40'}`,
          fontFamily: 'monospace',
        }}>
          run {runStatus.toLowerCase()} ✓
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
