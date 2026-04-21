'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

interface Alert {
  id: string
  name: string
  type: 'cost_threshold' | 'failure_rate'
  threshold: number
  windowRuns: number
  enabled: boolean
  lastFiredAt: string | null
  createdAt: string
  slackWebhookUrl: string | null
  webhookUrl: string | null
  emailTo: string | null
}

const TYPE_LABEL: Record<string, string> = {
  cost_threshold: 'Cost threshold',
  failure_rate:   'Failure rate',
}

const TYPE_COLOR: Record<string, string> = {
  cost_threshold: '#f59e0b',
  failure_rate:   '#f43f5e',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'cost_threshold', threshold: '', windowRuns: '20', slackWebhookUrl: '', webhookUrl: '', emailTo: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const data = await fetch(`${API}/alerts`, { credentials: 'include' }).then(r => r.json())
    setAlerts(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch(`${API}/alerts`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        threshold: Number(form.threshold),
        windowRuns: Number(form.windowRuns),
        ...(form.slackWebhookUrl && { slackWebhookUrl: form.slackWebhookUrl }),
        ...(form.webhookUrl      && { webhookUrl: form.webhookUrl }),
        ...(form.emailTo         && { emailTo: form.emailTo }),
      }),
    })
    setForm({ name: '', type: 'cost_threshold', threshold: '', windowRuns: '20', slackWebhookUrl: '', webhookUrl: '', emailTo: '' })
    setCreating(false)
    setSaving(false)
    load()
  }

  const toggle = async (alert: Alert) => {
    await fetch(`${API}/alerts/${alert.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !alert.enabled }),
    })
    load()
  }

  const remove = async (id: string) => {
    await fetch(`${API}/alerts/${id}`, { method: 'DELETE', credentials: 'include' })
    load()
  }

  const thresholdLabel = (a: Alert) =>
    a.type === 'cost_threshold'
      ? `$${a.threshold.toFixed(2)} per run`
      : `${a.threshold}% of last ${a.windowRuns} runs`

  return (
    <>
      <Topbar title="Alerts" description="Get notified when cost or failure thresholds are breached" />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setCreating(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', background: creating ? '#18181c' : '#7c6aff',
              border: `1px solid ${creating ? '#27272a' : 'transparent'}`,
              borderRadius: '6px', cursor: 'pointer',
              fontSize: '11px', color: creating ? '#71717a' : '#fff', fontFamily: 'inherit',
            }}
          >
            <Plus size={12} />
            {creating ? 'Cancel' : 'New alert'}
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', marginBottom: '16px' }}>New alert</div>
            <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Field label="Name">
                <input
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required style={inputStyle} placeholder="e.g. High cost run"
                />
              </Field>

              <Field label="Type">
                <select
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="cost_threshold">Cost threshold — fires when a run exceeds a USD cost</option>
                  <option value="failure_rate">Failure rate — fires when % of recent runs fails</option>
                </select>
              </Field>

              <Field label={form.type === 'cost_threshold' ? 'Cost threshold (USD)' : 'Failure rate threshold (%)'}>
                <input
                  type="number" min="0" step={form.type === 'cost_threshold' ? '0.001' : '1'}
                  value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                  required style={inputStyle}
                  placeholder={form.type === 'cost_threshold' ? '0.10' : '50'}
                />
              </Field>

              {form.type === 'failure_rate' && (
                <Field label="Window (last N runs)">
                  <input
                    type="number" min="1" max="100"
                    value={form.windowRuns} onChange={e => setForm(f => ({ ...f, windowRuns: e.target.value }))}
                    style={inputStyle}
                  />
                </Field>
              )}

              {/* Notification channels */}
              <div style={{ borderTop: '1px solid #27272a', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Notification channels <span style={{ color: '#3f3f46' }}>(optional — at least one to get notified)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Field label="Slack webhook URL">
                    <input
                      type="url" value={form.slackWebhookUrl}
                      onChange={e => setForm(f => ({ ...f, slackWebhookUrl: e.target.value }))}
                      style={inputStyle} placeholder="https://hooks.slack.com/services/…"
                    />
                  </Field>
                  <Field label="Generic webhook URL">
                    <input
                      type="url" value={form.webhookUrl}
                      onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
                      style={inputStyle} placeholder="https://your-service.com/webhook"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email" value={form.emailTo}
                      onChange={e => setForm(f => ({ ...f, emailTo: e.target.value }))}
                      style={inputStyle} placeholder="you@example.com"
                    />
                  </Field>
                </div>
              </div>

              <button type="submit" disabled={saving} style={{
                padding: '9px', background: '#7c6aff', border: 'none', borderRadius: '6px',
                cursor: saving ? 'default' : 'pointer', fontSize: '11px', color: '#fff', fontFamily: 'inherit',
              }}>
                {saving ? 'Creating…' : 'Create alert'}
              </button>
            </form>
          </div>
        )}

        {/* Alert list */}
        {alerts.length === 0 && !creating ? (
          <div style={{
            background: '#111114', border: '1px solid #27272a', borderRadius: '8px',
            padding: '40px', textAlign: 'center',
          }}>
            <Bell size={24} style={{ color: '#27272a', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '12px', color: '#52525b' }}>No alerts configured</div>
            <div style={{ fontSize: '11px', color: '#3f3f46', marginTop: '4px' }}>Create one to get notified when thresholds are breached</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map(alert => {
              const color = TYPE_COLOR[alert.type] ?? '#52525b'
              return (
                <div key={alert.id} style={{
                  background: '#111114', border: `1px solid ${alert.enabled ? '#27272a' : '#1c1c1f'}`,
                  borderRadius: '8px', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  opacity: alert.enabled ? 1 : 0.5,
                }}>
                  {/* Type badge */}
                  <div style={{
                    fontSize: '9px', padding: '2px 7px', borderRadius: '3px',
                    background: `${color}18`, border: `1px solid ${color}40`,
                    color, fontFamily: 'monospace', flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {TYPE_LABEL[alert.type]}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#e4e4e7', fontWeight: 500 }}>{alert.name}</div>
                    <div style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>
                      {thresholdLabel(alert)}
                      {alert.lastFiredAt && (
                        <span style={{ color, marginLeft: '8px' }}>
                          · last fired {new Date(alert.lastFiredAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {/* Channel badges */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {alert.slackWebhookUrl && <ChannelBadge label="Slack" />}
                      {alert.webhookUrl      && <ChannelBadge label="Webhook" />}
                      {alert.emailTo         && <ChannelBadge label={alert.emailTo} />}
                      {!alert.slackWebhookUrl && !alert.webhookUrl && !alert.emailTo && (
                        <span style={{ fontSize: '9px', color: '#3f3f46' }}>no notification channels</span>
                      )}
                    </div>
                  </div>

                  {/* Toggle */}
                  <button onClick={() => toggle(alert)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: alert.enabled ? '#22d3a0' : '#3f3f46', padding: '2px', flexShrink: 0 }}>
                    {alert.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>

                  {/* Delete */}
                  <button onClick={() => remove(alert.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f3f46', padding: '2px', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </>
  )
}

function ChannelBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: '9px', padding: '1px 6px', borderRadius: '3px',
      background: '#7c6aff18', border: '1px solid #7c6aff40',
      color: '#7c6aff', fontFamily: 'monospace',
    }}>{label}</span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: '10px', color: '#71717a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#18181c',
  border: '1px solid #27272a', borderRadius: '6px',
  color: '#e4e4e7', fontSize: '12px', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}
