interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div style={{
      background: '#111114',
      border: '1px solid #27272a',
      borderRadius: '8px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <span style={{ fontSize: '11px', color: '#a1a1aa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{
        fontSize: '28px',
        fontWeight: 700,
        fontFamily: 'var(--font-sans)',
        color: accent ?? '#e4e4e7',
        lineHeight: 1,
      }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '11px', color: '#a1a1aa' }}>{sub}</span>}
    </div>
  )
}
