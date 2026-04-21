import { Activity } from 'lucide-react'

interface TopbarProps {
  title: string
  description?: string
}

export function Topbar({ title, description }: TopbarProps) {
  return (
    <header style={{
      height: '56px',
      borderBottom: '1px solid #27272a',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#09090b',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <h1 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e4e4e7', fontFamily: 'var(--font-mono)' }}>
          {title}
        </h1>
        {description && (
          <span style={{ fontSize: '11px', color: '#71717a' }}>{description}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#22d3a0' }}>
          <Activity size={12} />
          <span>api live</span>
        </div>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c6aff, #4f3fcc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 600, color: '#fff',
        }}>S</div>
      </div>
    </header>
  )
}
