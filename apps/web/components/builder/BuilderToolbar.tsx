'use client'

import { Save, FolderOpen, Plus, Copy, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Pipeline } from '@/lib/api'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const PRESETS = [
  { label: 'hourly',  cron: '0 * * * *' },
  { label: 'daily',   cron: '0 9 * * *' },
  { label: 'weekly',  cron: '0 9 * * 1' },
  { label: 'monthly', cron: '0 9 1 * *' },
]

function describeCron(cron: string): string {
  if (!cron || typeof cron !== 'string') return cron || ''
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return cron
  const [min, hour, dom, month, dow] = parts as [string, string, string, string, string]
  if (min === '*' && hour === '*') return 'every minute'
  if (min === '0' && hour === '*') return 'every hour'
  if (min === '0' && hour !== '*' && dom === '*' && month === '*' && dow === '*')
    return `daily at ${hour.padStart(2, '0')}:00`
  if (min === '0' && hour !== '*' && dom === '*' && month === '*' && dow !== '*')
    return `every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Number(dow)] ?? `day ${dow}`} at ${hour.padStart(2, '0')}:00`
  if (min === '0' && hour !== '*' && dom !== '*' && month === '*' && dow === '*')
    return `monthly on day ${dom} at ${hour.padStart(2, '0')}:00`
  return cron
}

interface BuilderToolbarProps {
  name: string
  trigger: string
  pipelineId: string | null
  cron: string
  pipelines: Pipeline[]
  saving: boolean
  dirty: boolean
  onNameChange: (v: string) => void
  onTriggerChange: (v: string) => void
  onCronChange: (v: string) => void
  onLoad: (pipeline: Pipeline) => void
  onNew: () => void
  onSave: () => void
}

const TRIGGERS = ['manual', 'webhook', 'schedule']

export function BuilderToolbar({
  name, trigger, pipelineId, cron, pipelines, saving, dirty,
  onNameChange, onTriggerChange, onCronChange, onLoad, onNew, onSave,
}: BuilderToolbarProps) {
  const [copied, setCopied] = useState(false)
  const webhookUrl = pipelineId ? `${API}/webhooks/${pipelineId}` : null

  useEffect(() => {
    if (typeof name === 'string') return
    // #region agent log
    fetch('http://127.0.0.1:7570/ingest/69b88065-f2d7-475d-86db-a99ded2ad13e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'46580c'},body:JSON.stringify({sessionId:'46580c',runId:'pre-fix',hypothesisId:'H4',location:'builder/BuilderToolbar.tsx:57',message:'toolbar received non-string name prop',data:{nameType:typeof name,pipelineId:pipelineId ?? null,trigger},timestamp:Date.now()})}).catch(()=>{})
    // #endregion
  }, [name, pipelineId, trigger])

  const copyWebhook = () => {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0',
      background: '#111114', border: '1px solid #27272a', borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)', overflow: 'hidden',
    }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
      {/* Pipeline name */}
      <input
        value={name}
        onChange={e => onNameChange(e.target.value)}
        placeholder="pipeline name"
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: '12px', fontWeight: 600, color: '#e4e4e7',
          fontFamily: 'var(--font-mono)', width: '160px',
        }}
      />

      <div style={{ width: '1px', height: '16px', background: '#27272a' }} />

      {/* Trigger */}
      <select
        value={trigger}
        onChange={e => onTriggerChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: '11px', color: '#7c6aff', fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
        }}
      >
        {TRIGGERS.map(t => <option key={t} value={t} style={{ background: '#111114' }}>{t}</option>)}
      </select>

      <div style={{ width: '1px', height: '16px', background: '#27272a' }} />

      {/* Load existing */}
      {pipelines.length > 0 && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FolderOpen size={13} style={{ color: '#52525b' }} />
          <select
            defaultValue=""
            onChange={e => {
              const p = pipelines.find(p => p.id === e.target.value)
              if (p) onLoad(p)
              e.target.value = ''
            }}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: '11px', color: '#71717a', fontFamily: 'var(--font-mono)',
              cursor: 'pointer', maxWidth: '120px',
            }}
          >
            <option value="" disabled style={{ background: '#111114' }}>load pipeline</option>
            {pipelines.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#111114' }}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* New */}
      <button
        onClick={onNew}
        title="new pipeline"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#52525b', display: 'flex', padding: '2px',
        }}
      >
        <Plus size={14} />
      </button>

      <div style={{ width: '1px', height: '16px', background: '#27272a' }} />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving || !name || !name.trim()}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: dirty ? '#7c6aff' : '#18181c',
          border: `1px solid ${dirty ? '#7c6aff' : '#27272a'}`,
          borderRadius: '5px', padding: '4px 10px',
          fontSize: '11px', color: dirty ? '#fff' : '#52525b',
          cursor: saving || !name || !name.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-mono)', transition: 'all 0.15s',
        }}
      >
        <Save size={12} />
        {saving ? 'saving…' : 'save'}
      </button>
    </div>

    {/* Webhook URL row */}
    {trigger === 'webhook' && (
      <div style={{
        borderTop: '1px solid #27272a',
        padding: '7px 12px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '9px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>webhook</span>
        <span style={{
          fontSize: '10px', color: webhookUrl ? '#a1a1aa' : '#3f3f46',
          fontFamily: 'monospace', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {webhookUrl ?? 'save pipeline to get URL'}
        </span>
        {webhookUrl && (
          <button
            onClick={copyWebhook}
            title="copy webhook URL"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22d3a0' : '#52525b', display: 'flex', padding: '1px', flexShrink: 0 }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    )}
    {/* Schedule row */}
    {trigger === 'schedule' && (
      <div style={{ borderTop: '1px solid #27272a', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Presets */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onCronChange(p.cron)}
              style={{
                background: cron === p.cron ? '#27272a' : 'transparent',
                border: '1px solid #27272a', borderRadius: '4px',
                padding: '2px 8px', fontSize: '10px',
                color: cron === p.cron ? '#e4e4e7' : '#52525b',
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
              }}
            >{p.label}</button>
          ))}
        </div>

        {/* Cron input + description */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>cron</span>
          <input
            value={cron}
            onChange={e => onCronChange(e.target.value)}
            placeholder="0 9 * * *"
            style={{
              background: '#18181c', border: '1px solid #27272a', borderRadius: '4px',
              padding: '3px 8px', fontSize: '11px', color: '#e4e4e7',
              fontFamily: 'monospace', outline: 'none', width: '120px',
            }}
          />
          <span style={{ fontSize: '10px', color: '#7c6aff', fontFamily: 'monospace' }}>
            {describeCron(cron)}
          </span>
        </div>
      </div>
    )}
    </div>
  )
}
