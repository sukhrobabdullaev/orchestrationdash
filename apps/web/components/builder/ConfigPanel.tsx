'use client'

import { X } from 'lucide-react'
import type { AgentNodeData } from './AgentNode'

const MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'claude-opus-4-7',
]

const ROLES = ['pm', 'architect', 'engineer', 'qa', 'deploy', 'researcher']

const TOOLS = [
  { id: 'web_search', label: 'Web Search',  desc: 'Search the web for real-time info' },
  { id: 'read_file',  label: 'Read File',   desc: 'Read files from sandbox' },
  { id: 'write_file', label: 'Write File',  desc: 'Write files to sandbox' },
  { id: 'code_exec',  label: 'Code Exec',   desc: 'Run JavaScript snippets' },
]

const ROLE_COLOR: Record<string, string> = {
  pm:         '#7c6aff',
  architect:  '#22d3a0',
  engineer:   '#f59e0b',
  qa:         '#f43f5e',
  researcher: '#38bdf8',
}

interface ConfigPanelProps {
  nodeId: string
  data: AgentNodeData
  onChange: (nodeId: string, patch: Partial<AgentNodeData>) => void
  onClose: () => void
}

export function ConfigPanel({ nodeId, data, onChange, onClose }: ConfigPanelProps) {
  const c = ROLE_COLOR[data.role] ?? '#52525b'

  return (
    <div style={{
      width: '280px',
      flexShrink: 0,
      background: '#111114',
      borderLeft: '1px solid #27272a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #27272a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7' }}>Agent Config</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#52525b', display: 'flex', padding: '2px',
        }}>
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Name */}
        <Field label="Name">
          <input
            value={data.name}
            onChange={e => onChange(nodeId, { name: e.target.value })}
            style={inputStyle}
          />
        </Field>

        {/* Role */}
        <Field label="Role">
          <select
            value={data.role}
            onChange={e => onChange(nodeId, { role: e.target.value })}
            style={inputStyle}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>

        {/* Model */}
        <Field label="Model">
          <select
            value={data.model}
            onChange={e => onChange(nodeId, { model: e.target.value })}
            style={inputStyle}
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>

        {/* System prompt */}
        <Field label="System Prompt">
          <textarea
            value={(data.systemPrompt as string) ?? ''}
            onChange={e => onChange(nodeId, { systemPrompt: e.target.value })}
            rows={8}
            placeholder="You are a..."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
          />
        </Field>

        {/* Tool grants */}
        <Field label="Tool Grants">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {TOOLS.map(tool => {
              const grants = (data.tools as string[] | undefined) ?? []
              const enabled = grants.includes(tool.id)
              return (
                <label key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => {
                      const next = enabled
                        ? grants.filter(t => t !== tool.id)
                        : [...grants, tool.id]
                      onChange(nodeId, { tools: next })
                    }}
                    style={{ accentColor: '#7c6aff', width: '12px', height: '12px' }}
                  />
                  <div>
                    <div style={{ fontSize: '11px', color: '#e4e4e7' }}>{tool.label}</div>
                    <div style={{ fontSize: '10px', color: '#52525b' }}>{tool.desc}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </Field>

        {/* Node ID (read-only) */}
        <Field label="Node ID">
          <div style={{ fontSize: '10px', color: '#3f3f46', fontFamily: 'monospace', padding: '6px 0' }}>
            {nodeId}
          </div>
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: '10px', color: '#52525b', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: '6px',
      }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#18181c',
  border: '1px solid #27272a',
  borderRadius: '6px',
  padding: '7px 10px',
  fontSize: '11px',
  color: '#e4e4e7',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
}
