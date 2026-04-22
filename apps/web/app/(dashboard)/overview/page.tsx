import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/ui/StatCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { apiServer } from '@/lib/api-server'
import { type Run } from '@/lib/api'
import Link from 'next/link'

export default async function OverviewPage() {
  const [stats, runs] = await Promise.all([
    apiServer.stats().catch(() => null),
    apiServer.runs({ limit: '5' }).catch(() => []),
  ])

  return (
    <>
      <Topbar title="Overview" description="pipeline activity at a glance" />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <StatCard
            label="Total Runs"
            value={stats?.runs.total ?? '—'}
            sub={`${stats?.runs.running ?? 0} running · ${stats?.runs.queued ?? 0} queued`}
          />
          <StatCard
            label="Success Rate"
            value={stats ? `${stats.successRate}%` : '—'}
            sub={`${stats?.runs.succeeded ?? 0} succeeded · ${stats?.runs.failed ?? 0} failed`}
            accent={stats && stats.successRate >= 80 ? '#22d3a0' : stats && stats.successRate >= 50 ? '#f59e0b' : '#f43f5e'}
          />
          <StatCard
            label="Total Tokens"
            value={stats ? formatTokens(stats.totalTokens) : '—'}
            sub="across all runs"
          />
          <StatCard
            label="Total Cost"
            value={stats ? `$${stats.totalCostUsd.toFixed(4)}` : '—'}
            sub="USD · all models"
            accent="#7c6aff"
          />
        </div>

        {/* Recent runs */}
        <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>Recent Runs</span>
            <Link href="/runs" style={{ fontSize: '11px', color: '#7c6aff', textDecoration: 'none' }}>view all →</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['Pipeline', 'Input', 'Status', 'Tokens', 'Cost', 'Started'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', color: '#52525b', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '24px 20px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>no runs yet</td></tr>
              )}
              {runs.map((run: Run) => (
                <tr key={run.id} style={{ borderBottom: '1px solid #1c1c1f' }}>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{run.pipeline?.name ?? '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#e4e4e7', maxWidth: '220px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{run.input}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}><StatusPill status={run.status} /></td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{formatTokens(run.totalTokens)}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#7c6aff' }}>${run.totalCostUsd.toFixed(4)}</td>
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
