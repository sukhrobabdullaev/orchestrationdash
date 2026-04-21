const CONFIG = {
  QUEUED:  { label: 'queued',  color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)' },
  RUNNING: { label: 'running', color: '#22d3a0', bg: 'rgba(34,211,160,0.1)'  },
  SUCCESS: { label: 'success', color: '#22d3a0', bg: 'rgba(34,211,160,0.1)'  },
  FAILED:  { label: 'failed',  color: '#f43f5e', bg: 'rgba(244,63,94,0.1)'   },
  PENDING: { label: 'pending', color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)' },
} as const

type Status = keyof typeof CONFIG

export function StatusPill({ status }: { status: string }) {
  const cfg = CONFIG[status as Status] ?? CONFIG.PENDING
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.05em',
      color: cfg.color,
      background: cfg.bg,
      textTransform: 'uppercase',
    }}>
      {status === 'RUNNING' && (
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: cfg.color,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}
      {cfg.label}
    </span>
  )
}
