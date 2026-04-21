'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn.email({ email, password })
    setLoading(false)
    if (error) { setError(error.message ?? 'Sign in failed'); return }
    router.push('/')
  }

  return (
    <div style={{ width: '100%', maxWidth: '360px', padding: '0 16px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#e4e4e7', letterSpacing: '-0.02em' }}>AgentForge</div>
        <div style={{ fontSize: '11px', color: '#52525b', marginTop: '6px' }}>sign in to your workspace</div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '10px', color: '#71717a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={inputStyle}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label style={{ fontSize: '10px', color: '#71717a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>

        {error && <div style={{ fontSize: '11px', color: '#f43f5e', padding: '8px 12px', background: '#f43f5e10', borderRadius: '4px', border: '1px solid #f43f5e30' }}>{error}</div>}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'signing in…' : 'Sign in'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#52525b' }}>
        No account?{' '}
        <a href="/signup" style={{ color: '#7c6aff', textDecoration: 'none' }}>Sign up</a>
      </div>
    </div>
  )
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
