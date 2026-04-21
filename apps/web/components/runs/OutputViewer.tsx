'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface OutputViewerProps {
  output: Record<string, unknown>
  agentRole?: string
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

function JsonToken({ value }: { value: unknown }) {
  if (value === null) return <span style={{ color: '#52525b' }}>null</span>
  if (typeof value === 'boolean') return <span style={{ color: '#f59e0b' }}>{String(value)}</span>
  if (typeof value === 'number') return <span style={{ color: '#22d3a0' }}>{value}</span>
  if (typeof value === 'string') {
    if (value.length > 120) {
      return <span style={{ color: '#a1a1aa' }}>"{value.slice(0, 120)}…" <span style={{ color: '#3f3f46' }}>({value.length} chars)</span></span>
    }
    return <span style={{ color: '#a1a1aa' }}>"{value}"</span>
  }
  if (Array.isArray(value)) return <span style={{ color: '#52525b' }}>[array · {value.length}]</span>
  if (typeof value === 'object') return <span style={{ color: '#52525b' }}>{`{object · ${Object.keys(value as object).length} keys}`}</span>
  return <span style={{ color: '#a1a1aa' }}>{String(value)}</span>
}

function FieldRow({ fieldKey, value, accent }: { fieldKey: string; value: unknown; accent: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isLong = typeof value === 'string' && value.length > 120
  const isObject = typeof value === 'object' && value !== null
  const isExpandable = isLong || isObject
  const displayText = typeof value === 'string' ? value : JSON.stringify(value, null, 2)

  const copy = () => {
    navigator.clipboard.writeText(displayText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ borderBottom: '1px solid #1c1c1f' }}>
      {/* Key row */}
      <div
        onClick={() => isExpandable && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 20px', cursor: isExpandable ? 'pointer' : 'default',
        }}
      >
        {isExpandable
          ? (open ? <ChevronDown size={10} style={{ color: '#52525b', flexShrink: 0 }} /> : <ChevronRight size={10} style={{ color: '#52525b', flexShrink: 0 }} />)
          : <span style={{ width: 10 }} />
        }
        <span style={{ fontSize: '10px', color: accent, fontFamily: 'monospace', letterSpacing: '0.05em', minWidth: '120px' }}>{fieldKey}</span>
        {!open && <JsonToken value={value} />}
        <div style={{ flex: 1 }} />
        <button
          onClick={e => { e.stopPropagation(); copy() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22d3a0' : '#3f3f46', display: 'flex', padding: '2px', flexShrink: 0 }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: '0 20px 12px 38px' }}>
          <pre style={{
            margin: 0, fontSize: '11px', color: '#a1a1aa',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: '320px', overflow: 'auto',
            background: '#0d0d10', padding: '12px', borderRadius: '4px',
            border: `1px solid ${accent}20`, lineHeight: '1.6',
          }}>{displayText}</pre>
        </div>
      )}
    </div>
  )
}

export function OutputViewer({ output, agentRole }: OutputViewerProps) {
  const [open, setOpen] = useState(false)
  const accent = ROLE_COLOR[agentRole ?? ''] ?? '#7c6aff'
  const keys = Object.keys(output).filter(k => !SKIP_KEYS.has(k))
  if (keys.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid #1c1c1f' }}>
      {/* Toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={11} style={{ color: '#52525b' }} /> : <ChevronRight size={11} style={{ color: '#52525b' }} />}
        <span style={{ fontSize: '11px', color: '#52525b' }}>output</span>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
          {keys.map(k => (
            <span key={k} style={{
              fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
              background: `${accent}18`, color: accent, fontFamily: 'monospace',
            }}>{k}</span>
          ))}
        </div>
      </button>

      {/* Fields */}
      {open && keys.map(k => (
        <FieldRow key={k} fieldKey={k} value={output[k]} accent={accent} />
      ))}
    </div>
  )
}
