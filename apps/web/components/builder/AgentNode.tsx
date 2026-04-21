'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface AgentNodeData {
  role: string
  name: string
  model: string
  status?: 'idle' | 'running' | 'success' | 'failed'
  [key: string]: unknown
}

const ROLE_COLOR: Record<string, string> = {
  pm:         '#7c6aff',
  architect:  '#22d3a0',
  engineer:   '#f59e0b',
  qa:         '#f43f5e',
  deploy:     '#a78bfa',
  researcher: '#38bdf8',
}

const STATUS_DOT: Record<string, string> = {
  running: '#f59e0b',
  success: '#22d3a0',
  failed:  '#f43f5e',
  idle:    '#3f3f46',
}

function color(role: string) {
  return ROLE_COLOR[role] ?? '#52525b'
}

export function AgentNode({ data, selected }: NodeProps) {
  const d = data as AgentNodeData
  const c = color(d.role)
  const dotColor = STATUS_DOT[d.status ?? 'idle'] ?? '#3f3f46'
  const isPulsing = d.status === 'running'

  return (
    <div style={{
      width: '160px',
      background: '#18181c',
      border: `1px solid ${selected ? c : `${c}40`}`,
      borderRadius: '10px',
      fontFamily: 'var(--font-mono)',
      boxShadow: selected ? `0 0 0 2px ${c}30` : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: `1px solid ${c}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
          fontWeight: 700, color: c,
        }}>{d.role}</span>

        {/* Status dot */}
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: dotColor, display: 'inline-block', flexShrink: 0,
          animation: isPulsing ? 'pulse 1.5s infinite' : 'none',
        }} />
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>
          {d.name}
        </div>
        <div style={{ fontSize: '10px', color: '#3f3f46' }}>
          {d.model}
        </div>
      </div>

      {/* React Flow handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: c, border: 'none', width: '8px', height: '8px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: c, border: 'none', width: '8px', height: '8px' }}
      />
    </div>
  )
}
