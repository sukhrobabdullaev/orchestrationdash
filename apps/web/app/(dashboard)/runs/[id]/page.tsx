import { Topbar } from '@/components/layout/Topbar'
import { StatusPill } from '@/components/ui/StatusPill'
import { LogStream } from '@/components/runs/LogStream'
import { PoolInspector } from '@/components/runs/PoolInspector'
import { OutputViewer } from '@/components/runs/OutputViewer'
import { api, type RunStep } from '@/lib/api'
import { notFound } from 'next/navigation'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await api.run(id).catch(() => null)
  if (!run) notFound()

  const isLive = run.status === 'RUNNING' || run.status === 'QUEUED'

  return (
    <>
      <Topbar
        title={`Run · ${id.slice(-8)}`}
        description={run.input}
      />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Status',   value: <StatusPill status={run.status} /> },
            { label: 'Pipeline', value: run.pipeline?.name ?? '—' },
            { label: 'Tokens',   value: `${run.totalTokens.toLocaleString()}` },
            { label: 'Cost',     value: `$${run.totalCostUsd.toFixed(6)}` },
            { label: 'Trigger',  value: run.trigger },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '6px', padding: '10px 16px' }}>
              <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '12px', color: '#e4e4e7' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Message pool inspector — only for completed runs */}
        {!isLive && run.steps && run.steps.length > 0 && (
          <PoolInspector
            steps={(run.steps ?? []).map((s: RunStep) => ({
              id: s.id,
              agentName: s.agentName,
              agentRole: s.agentRole,
              status: s.status,
              output: s.output,
            }))}
          />
        )}

        {/* Live stream or static steps */}
        {isLive ? (
          <LogStream runId={id} apiUrl={API_URL} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(run.steps ?? []).map((step: RunStep, i: number) => (
              <div key={step.id} style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
                {/* Step header */}
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
                  <StatusPill status={step.status} />
                  <div style={{ fontSize: '11px', color: '#52525b', textAlign: 'right' }}>
                    {step.inputTokens + step.outputTokens > 0 && (
                      <div>{(step.inputTokens + step.outputTokens).toLocaleString()} tokens</div>
                    )}
                    {step.durationMs && <div>{(step.durationMs / 1000).toFixed(1)}s</div>}
                  </div>
                </div>

                {/* Logs */}
                {step.logs.length > 0 && (
                  <div style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {step.logs.map((log: RunStep['logs'][number]) => (
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

                {/* Output preview */}
                {step.output && step.status === 'SUCCESS' && (
                  <OutputViewer output={step.output} agentRole={step.agentRole} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
