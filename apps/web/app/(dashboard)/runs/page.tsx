import { Topbar } from '@/components/layout/Topbar'
import { StatusPill } from '@/components/ui/StatusPill'
import { apiServer } from '@/lib/api-server'
import { type Run } from '@/lib/api'
import Link from 'next/link'

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const runs = await apiServer.runs(status ? { status } : {}).catch(() => [])

  const STATUSES = ['', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED']

  return (
    <>
      <Topbar title="Runs" description={`${runs.length} run${runs.length !== 1 ? 's' : ''}`} />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {STATUSES.map(s => (
            <Link key={s} href={s ? `/runs?status=${s}` : '/runs'} style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '11px',
              fontWeight: 500, textDecoration: 'none',
              background: status === s || (!status && !s) ? '#18181c' : 'transparent',
              color: status === s || (!status && !s) ? '#e4e4e7' : '#71717a',
              border: '1px solid',
              borderColor: status === s || (!status && !s) ? '#27272a' : 'transparent',
            }}>{s || 'All'}</Link>
          ))}
        </div>

        {/* Runs table */}
        <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['Run ID', 'Pipeline', 'Input', 'Status', 'Tokens', 'Cost', 'Duration', 'Started'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', color: '#52525b', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>no runs found</td></tr>
              )}
              {runs.map((run: Run) => (
                <tr key={run.id} style={{ borderBottom: '1px solid #1c1c1f', cursor: 'pointer' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <Link href={`/runs/${run.id}`} style={{ fontSize: '11px', color: '#7c6aff', textDecoration: 'none', fontFamily: 'monospace' }}>
                      {run.id.slice(-8)}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{run.pipeline?.name ?? '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#e4e4e7', maxWidth: '200px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{run.input}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}><StatusPill status={run.status} /></td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{formatTokens(run.totalTokens)}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#7c6aff' }}>${run.totalCostUsd.toFixed(4)}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{formatDuration(run.startedAt, run.finishedAt)}</td>
                  <td style={{ padding: '12px 20px', fontSize: '11px', color: '#52525b' }}>{run.startedAt ? timeAgo(run.startedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
