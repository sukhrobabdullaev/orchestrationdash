import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/ui/StatCard'
import { CostBarChart, TokenBarChart } from '@/components/charts/CostChart'
import { apiServer } from '@/lib/api-server'
import { type Run } from '@/lib/api'

export default async function CostPage() {
  const [stats, runs] = await Promise.all([
    apiServer.stats().catch(() => null),
    apiServer.runs({ limit: '30' }).catch(() => [] as Run[]),
  ])

  // Build chart data — most recent 20 successful runs, oldest→newest
  const chartRuns = [...runs]
    .filter(r => r.totalTokens > 0)
    .slice(0, 20)
    .reverse()

  const chartData = chartRuns.map(r => ({
    label: r.id.slice(-6),
    cost: Number(r.totalCostUsd.toFixed(6)),
    tokens: r.totalTokens,
    status: r.status,
  }))

  // Per-pipeline breakdown
  const byPipeline = new Map<string, { name: string; cost: number; tokens: number; runs: number }>()
  for (const r of runs) {
    const key = r.pipeline?.name ?? r.pipelineId ?? 'unknown'
    const prev = byPipeline.get(key) ?? { name: key, cost: 0, tokens: 0, runs: 0 }
    byPipeline.set(key, {
      name: key,
      cost: prev.cost + r.totalCostUsd,
      tokens: prev.tokens + r.totalTokens,
      runs: prev.runs + 1,
    })
  }
  const pipelineRows = Array.from(byPipeline.values()).sort((a, b) => b.cost - a.cost)

  return (
    <>
      <Topbar title="Cost" description="token usage and spend across all runs" />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <StatCard
            label="Total Spend"
            value={stats ? `$${stats.totalCostUsd.toFixed(4)}` : '—'}
            sub="USD · all models"
            accent="#7c6aff"
          />
          <StatCard
            label="Total Tokens"
            value={stats ? formatTokens(stats.totalTokens) : '—'}
            sub="input + output"
          />
          <StatCard
            label="Avg Cost / Run"
            value={stats && stats.runs.total > 0
              ? `$${(stats.totalCostUsd / stats.runs.total).toFixed(5)}`
              : '—'}
            sub={`over ${stats?.runs.total ?? 0} runs`}
          />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>Cost per Run</div>
            <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '16px' }}>last {chartData.length} runs · USD</div>
            {chartData.length > 0
              ? <CostBarChart data={chartData} />
              : <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '12px' }}>no data</div>
            }
          </div>

          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>Tokens per Run</div>
            <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '16px' }}>last {chartData.length} runs · input + output</div>
            {chartData.length > 0
              ? <TokenBarChart data={chartData} />
              : <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '12px' }}>no data</div>
            }
          </div>
        </div>

        {/* Per-pipeline breakdown */}
        <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>By Pipeline</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['Pipeline', 'Runs', 'Total Tokens', 'Total Cost', 'Avg Cost'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', color: '#52525b', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pipelineRows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>no data</td></tr>
              )}
              {pipelineRows.map(row => (
                <tr key={row.name} style={{ borderBottom: '1px solid #1c1c1f' }}>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#e4e4e7' }}>{row.name}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{row.runs}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{formatTokens(row.tokens)}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#7c6aff' }}>${row.cost.toFixed(4)}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#52525b' }}>${(row.cost / row.runs).toFixed(5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: '#52525b' }}>
          {[['SUCCESS', '#22d3a0'], ['FAILED', '#f43f5e'], ['RUNNING', '#f59e0b']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
              {label}
            </div>
          ))}
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
