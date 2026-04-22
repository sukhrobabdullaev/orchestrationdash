'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export function RunPipelineButton({ pipelineId }: { pipelineId: string }) {
  const [showModal, setShowModal] = useState(false)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const handleRun = async () => {
    if (!input.trim()) return
    
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/runs`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId, input, trigger: 'manual' }),
      })
      
      if (!res.ok) throw new Error('Failed to trigger run')
      
      const data = await res.json() as { runId: string }
      router.push(`/runs/${data.runId}`)
    } catch (err) {
      console.error('Run trigger failed:', err)
      alert('Failed to start run. Please try again.')
    } finally {
      setSubmitting(false)
      setShowModal(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: '#7c6aff',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#6d5be8')}
        onMouseLeave={e => (e.currentTarget.style.background = '#7c6aff')}
      >
        <Play size={14} />
        Run Pipeline
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            style={{
              background: '#111114',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e4e4e7', marginBottom: '16px' }}>
              Run Pipeline
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#a1a1aa', marginBottom: '8px' }}>
                Task Description
              </label>
              <textarea
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Describe what you want the agents to do..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  background: '#18181c',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  color: '#e4e4e7',
                  fontSize: '13px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun()
                }}
              />
              <div style={{ fontSize: '10px', color: '#52525b', marginTop: '6px' }}>
                This will be passed to the first agent in the pipeline
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  background: '#18181c',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  color: '#a1a1aa',
                  fontSize: '12px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                disabled={!input.trim() || submitting}
                style={{
                  padding: '8px 16px',
                  background: input.trim() && !submitting ? '#7c6aff' : '#3f3f46',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: input.trim() && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Starting...' : 'Start Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
