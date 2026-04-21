'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

interface Workspace {
  id: string
  name: string
  apiKey: string
  createdAt: string
}

interface Me {
  id: string
  name: string
  email: string
}

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)

  const load = useCallback(async () => {
    const [ws, user] = await Promise.all([
      fetch(`${API}/settings/workspace`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API}/settings/me`, { credentials: 'include' }).then(r => r.json()),
    ])
    setWorkspace(ws)
    setMe(user)
    setNameInput(ws.name)
  }, [])

  useEffect(() => { load() }, [load])

  const saveName = async () => {
    if (!nameInput.trim()) return
    setSaving(true)
    const ws = await fetch(`${API}/settings/workspace`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput }),
    }).then(r => r.json())
    setWorkspace(ws)
    setSaving(false)
  }

  const rotateKey = async () => {
    if (!confirmRotate) { setConfirmRotate(true); return }
    setRotating(true)
    setConfirmRotate(false)
    const ws = await fetch(`${API}/settings/workspace/rotate-key`, {
      method: 'POST',
      credentials: 'include',
    }).then(r => r.json())
    setWorkspace(ws)
    setKeyVisible(true)
    setRotating(false)
  }

  const copyKey = () => {
    if (!workspace) return
    navigator.clipboard.writeText(workspace.apiKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const maskedKey = workspace
    ? workspace.apiKey.slice(0, 8) + '••••••••••••••••••••••••••••••••' + workspace.apiKey.slice(-4)
    : ''

  return (
    <>
      <Topbar title="Settings" description="Manage your workspace and API access" />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>

        {/* Account */}
        <Section title="Account">
          <Row label="Name" value={me?.name ?? '—'} />
          <Row label="Email" value={me?.email ?? '—'} />
          <Row label="User ID" value={me?.id ?? '—'} mono dim />
        </Section>

        {/* Workspace */}
        <Section title="Workspace">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1c1c1f' }}>
            <label style={labelStyle}>Workspace name</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                style={inputStyle}
              />
              <button
                onClick={saveName}
                disabled={saving || nameInput === workspace?.name}
                style={btnStyle(saving || nameInput === workspace?.name)}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          <Row label="Workspace ID" value={workspace?.id ?? '—'} mono dim />
          <Row label="Created" value={workspace ? new Date(workspace.createdAt).toLocaleDateString() : '—'} />
        </Section>

        {/* API Key */}
        <Section title="API Key">
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '12px' }}>
              Use this key to authenticate API requests from external systems. Treat it like a password — never expose it in client-side code.
            </div>

            {/* Key display */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#0d0d10', border: '1px solid #27272a', borderRadius: '6px',
              padding: '10px 12px', marginBottom: '12px',
            }}>
              <code style={{ flex: 1, fontSize: '11px', color: '#a1a1aa', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {keyVisible ? (workspace?.apiKey ?? '—') : maskedKey}
              </code>
              <button onClick={() => setKeyVisible(v => !v)} style={iconBtn} title={keyVisible ? 'Hide' : 'Show'}>
                {keyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button onClick={copyKey} style={iconBtn} title="Copy">
                {copied ? <Check size={13} style={{ color: '#22d3a0' }} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Usage example */}
            <div style={{ background: '#0d0d10', border: '1px solid #1c1c1f', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', color: '#52525b', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Example</div>
              <code style={{ fontSize: '10px', color: '#52525b', fontFamily: 'monospace' }}>
                {'curl -H "X-API-Key: '}
                <span style={{ color: '#7c6aff' }}>{workspace?.apiKey.slice(0, 12) ?? 'af_…'}…</span>
                {'" http://localhost:3001/runs'}
              </code>
            </div>

            {/* Rotate key */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={rotateKey}
                disabled={rotating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', background: confirmRotate ? '#f43f5e18' : '#18181c',
                  border: `1px solid ${confirmRotate ? '#f43f5e60' : '#27272a'}`,
                  borderRadius: '6px', cursor: 'pointer',
                  fontSize: '11px', color: confirmRotate ? '#f43f5e' : '#71717a',
                  fontFamily: 'inherit',
                }}
              >
                <RefreshCw size={11} style={{ animation: rotating ? 'spin 1s linear infinite' : 'none' }} />
                {confirmRotate ? 'Click again to confirm rotate' : 'Rotate key'}
              </button>
              {confirmRotate && (
                <button onClick={() => setConfirmRotate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#52525b', fontFamily: 'inherit' }}>
                  Cancel
                </button>
              )}
            </div>
            {confirmRotate && (
              <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '8px' }}>
                ⚠ This will invalidate the current key immediately. Any services using it will need to be updated.
              </div>
            )}
          </div>
        </Section>

      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #27272a' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, mono, dim }: { label: string; value: string; mono?: boolean; dim?: boolean }) {
  return (
    <div style={{ padding: '10px 20px', borderBottom: '1px solid #1c1c1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '11px', color: '#71717a' }}>{label}</span>
      <span style={{ fontSize: '11px', color: dim ? '#52525b' : '#a1a1aa', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px', color: '#71717a', letterSpacing: '0.08em', textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 12px', background: '#18181c',
  border: '1px solid #27272a', borderRadius: '6px',
  color: '#e4e4e7', fontSize: '12px', fontFamily: 'inherit', outline: 'none',
}

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 16px', background: disabled ? '#18181c' : '#7c6aff',
  border: 'none', borderRadius: '6px', cursor: disabled ? 'default' : 'pointer',
  fontSize: '11px', color: disabled ? '#52525b' : '#fff', fontFamily: 'inherit',
})

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#52525b', padding: '2px', display: 'flex', flexShrink: 0,
}
