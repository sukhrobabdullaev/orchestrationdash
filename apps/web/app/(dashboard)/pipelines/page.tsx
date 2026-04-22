'use client'

import { Topbar } from '@/components/layout/Topbar'
import { api, type Pipeline } from '@/lib/api'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])

  useEffect(() => {
    api.pipelines().then(setPipelines).catch(() => setPipelines([]))
  }, [])

  return (
    <>
      <Topbar title="Pipelines" description={`${pipelines.length} pipeline${pipelines.length !== 1 ? 's' : ''}`} />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {pipelines.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>
            no pipelines yet
          </div>
        )}
        {pipelines.map((p: Pipeline) => (
          <Link key={p.id} href={`/pipelines/${p.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#111114', border: '1px solid #27272a', borderRadius: '8px',
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px',
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>{p.name}</div>
                {p.description && (
                  <div style={{ fontSize: '11px', color: '#52525b' }}>{p.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Trigger</div>
                  <div style={{ fontSize: '11px', color: '#7c6aff' }}>{p.trigger}</div>
                </div>
                {p._count && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Runs</div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{p._count.runs}</div>
                  </div>
                )}
                <div style={{ fontSize: '16px', color: '#27272a' }}>›</div>
              </div>
            </div>
          </Link>
        ))}
      </main>
    </>
  )
}
