'use client'

import { useState } from 'react'

interface PoolInspectorProps {
  steps: {
    id: string
    agentName: string
    agentRole: string
    status: string
    output: Record<string, unknown> | null
  }[]
}

const ROLE_COLOR: Record<string, string> = {
  pm:         '#7c6aff',
  architect:  '#22d3a0',
  engineer:   '#f59e0b',
  qa:         '#f43f5e',
  deploy:     '#a78bfa',
  researcher: '#38bdf8',
}

const SKIP_KEYS = new Set(['input', 'runId'])

export function PoolInspector({ steps }: PoolInspectorProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  // Build cumulative pool state per step
  const snapshots: { stepId: string; agentName: string; role: string; newKeys: string[]; pool: Record<string, unknown> }[] = []
  let pool: Record<string, unknown> = {}

  for (const step of steps) {
    if (!step.output) continue
    const before = new Set(Object.keys(pool))
    pool = { ...step.output }
    const newKeys = Object.keys(pool).filter(k => !before.has(k) && !SKIP_KEYS.has(k))
    snapshots.push({ stepId: step.id, agentName: step.agentName, role: step.agentRole, newKeys, pool: { ...pool } })
  }

  if (snapshots.length === 0) return null

  const finalPool = snapshots[snapshots.length - 1]?.pool ?? {}
  const allKeys = Object.keys(finalPool).filter(k => !SKIP_KEYS.has(k))

  return (
    <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>Message Pool</span>
          <span style={{ fontSize: '11px', color: '#52525b', marginLeft: '8px' }}>{allKeys.length} keys</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {allKeys.map(k => (
            <span key={k} style={{
              fontSize: '9px', padding: '2px 6px', borderRadius: '3px',
              background: '#18181c', border: '1px solid #27272a', color: '#52525b',
              fontFamily: 'monospace',
            }}>{k}</span>
          ))}
        </div>
      </div>

      {/* Per-step pool snapshots */}
      {snapshots.map((snap, i) => {
        const color = ROLE_COLOR[snap.role] ?? '#52525b'
        const isOpen = expanded === snap.stepId
        return (
          <div key={snap.stepId} style={{ borderBottom: i < snapshots.length - 1 ? '1px solid #1c1c1f' : 'none' }}>
            <button
              onClick={() => setExpanded(isOpen ? null : snap.stepId)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '9px', color, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, width: '72px', flexShrink: 0 }}>{snap.role}</span>
              <span style={{ fontSize: '11px', color: '#a1a1aa', flex: 1 }}>{snap.agentName}</span>

              {/* New keys added by this step */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {snap.newKeys.map(k => (
                  <span key={k} style={{
                    fontSize: '9px', padding: '1px 6px', borderRadius: '3px',
                    background: `${color}18`, border: `1px solid ${color}40`,
                    color, fontFamily: 'monospace',
                  }}>+{k}</span>
                ))}
                {snap.newKeys.length === 0 && (
                  <span style={{ fontSize: '10px', color: '#3f3f46' }}>no new keys</span>
                )}
              </div>

              <span style={{ fontSize: '10px', color: '#3f3f46', marginLeft: '8px' }}>{isOpen ? '▾' : '▸'}</span>
            </button>

            {/* Expanded: show new key values */}
            {isOpen && snap.newKeys.length > 0 && (
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {snap.newKeys.map(k => (
                  <div key={k}>
                    <div style={{ fontSize: '10px', color, marginBottom: '4px', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                      {k}
                    </div>
                    <pre style={{
                      margin: 0, fontSize: '11px', color: '#a1a1aa',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: '240px', overflow: 'auto',
                      background: '#18181c', padding: '10px', borderRadius: '4px',
                      border: `1px solid ${color}20`,
                    }}>
                      {typeof snap.pool[k] === 'string'
                        ? snap.pool[k] as string
                        : JSON.stringify(snap.pool[k], null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
