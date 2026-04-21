'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/auth-client'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp.email({ name, email, password })
    setLoading(false)
    if (error) { setError(error.message ?? 'Sign up failed'); return }
    router.push('/')
  }

  return (
    <div style={{ width: '100%', maxWidth: '360px', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#e4e4e7', letterSpacing: '-0.02em' }}>AgentForge</div>
        <div style={{ fontSize: '11px', color: '#52525b', marginTop: '6px' }}>create your workspace</div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="Your name" />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={inputStyle} placeholder="min. 8 characters" />
        </div>

        {error && <div style={{ fontSize: '11px', color: '#f43f5e', padding: '8px 12px', background: '#f43f5e10', borderRadius: '4px', border: '1px solid #f43f5e30' }}>{error}</div>}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'creating account…' : 'Create account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#52525b' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#7c6aff', textDecoration: 'none' }}>Sign in</a>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px', color: '#71717a', letterSpacing: '0.08em',
  textTransform: 'uppercase', display: 'block', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#111114',
  border: '1px solid #27272a', borderRadius: '6px',
  color: '#e4e4e7', fontSize: '12px', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '10px', background: '#7c6aff',
  border: 'none', borderRadius: '6px', color: '#fff',
  fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer',
  fontWeight: 600, marginTop: '4px',
}
