'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

interface UsageData {
  daily:      { date: string; tokens: number; cost: number; runs: number }[]
  monthly:    { month: string; tokens: number; cost: number; runs: number }[]
  byPipeline: { id: string; name: string; tokens: number; cost: number; runs: number }[]
  byAgent:    { role: string; inputTokens: number; outputTokens: number; cost: number; calls: number }[]
  totalTokens: number
  totalCost:   number
  runCount:    number
}

const WINDOWS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [window, setWindow] = useState(30)
  const [view, setView] = useState<'tokens' | 'cost'>('cost')

  const load = useCallback(async () => {
    const res = await fetch(`${API}/usage?days=${window}`, { credentials: 'include' })
    if (res.ok) setData(await res.json())
  }, [window])

  useEffect(() => { load() }, [load])

  if (!data) return (
    <>
      <Topbar title="Usage" description="Token and cost analytics" />
      <main style={{ padding: '28px', color: '#52525b', fontSize: '12px' }}>Loading…</main>
    </>
  )

  const chartData = data.daily.map(d => ({
    ...d,
    date: d.date.slice(5),           // MM-DD
    costFormatted: d.cost.toFixed(4),
  }))

  const maxTokens = Math.max(...data.daily.map(d => d.tokens), 1)
  const maxCost   = Math.max(...data.daily.map(d => d.cost), 0.0001)

  return (
    <>
      <Topbar title="Usage" description={`Token and cost analytics · last ${window} days`} />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Window selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {WINDOWS.map(w => (
              <button key={w.days} onClick={() => setWindow(w.days)} style={{
                padding: '5px 12px', borderRadius: '5px', fontSize: '11px',
                background: window === w.days ? '#7c6aff' : '#111114',
                border: `1px solid ${window === w.days ? 'transparent' : '#27272a'}`,
                color: window === w.days ? '#fff' : '#71717a',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{w.label}</button>
            ))}
          </div>
          {/* Metric toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['cost', 'tokens'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 12px', borderRadius: '5px', fontSize: '11px',
                background: view === v ? '#18181c' : 'transparent',
                border: `1px solid ${view === v ? '#27272a' : 'transparent'}`,
                color: view === v ? '#e4e4e7' : '#52525b',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{v === 'cost' ? 'Cost ($)' : 'Tokens'}</button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total cost',    value: `$${data.totalCost.toFixed(4)}`,          accent: '#22d3a0' },
            { label: 'Total tokens',  value: data.totalTokens.toLocaleString(),         accent: '#7c6aff' },
            { label: 'Successful runs', value: data.runCount.toLocaleString(),          accent: '#f59e0b' },
            { label: 'Avg cost / run', value: data.runCount > 0 ? `$${(data.totalCost / data.runCount).toFixed(4)}` : '—', accent: '#38bdf8' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '6px', padding: '12px 18px', minWidth: '160px' }}>
              <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: accent, fontFamily: "'Syne', sans-serif" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Daily chart */}
        <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', marginBottom: '16px' }}>
            {view === 'cost' ? 'Daily cost (USD)' : 'Daily tokens'}
          </div>
          {chartData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '11px' }}>No data for this window</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c6aff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c6aff" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} width={55}
                  domain={[0, view === 'cost' ? maxCost * 1.2 : maxTokens * 1.2]}
                  tickFormatter={v => view === 'cost' ? `$${Number(v).toFixed(3)}` : Number(v).toLocaleString()}
                />
                <Tooltip
                  contentStyle={{ background: '#18181c', border: '1px solid #27272a', borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(v) => { const n = Number(v ?? 0); return view === 'cost' ? [`$${n.toFixed(4)}`, 'Cost'] : [n.toLocaleString(), 'Tokens'] }}
                />
                <Area
                  type="monotone" dataKey={view === 'cost' ? 'cost' : 'tokens'}
                  stroke="#7c6aff" strokeWidth={2} fill="url(#grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly bar + Agent breakdown side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Monthly */}
          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', marginBottom: '16px' }}>Monthly cost</div>
            {data.monthly.length === 0 ? (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '11px' }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.monthly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${Number(v).toFixed(2)}`} />
                  <Tooltip contentStyle={{ background: '#18181c', border: '1px solid #27272a', borderRadius: 6, fontSize: 11 }} labelStyle={{ color: '#a1a1aa' }} formatter={(v) => [`$${Number(v ?? 0).toFixed(4)}`, 'Cost']} />
                  <Bar dataKey="cost" fill="#22d3a0" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* By agent */}
          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7', marginBottom: '16px' }}>Token usage by agent</div>
            {data.byAgent.length === 0 ? (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '11px' }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.byAgent} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1f" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${Number(v).toLocaleString()}`} />
                  <YAxis type="category" dataKey="role" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip contentStyle={{ background: '#18181c', border: '1px solid #27272a', borderRadius: 6, fontSize: 11 }} labelStyle={{ color: '#a1a1aa' }} formatter={(v) => [Number(v ?? 0).toLocaleString(), 'Tokens']} />
                  <Bar dataKey="inputTokens"  stackId="a" name="Input"  fill="#7c6aff" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outputTokens" stackId="a" name="Output" fill="#22d3a0" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Per-pipeline table */}
        {data.byPipeline.length > 0 && (
          <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #27272a' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e4e4e7' }}>By pipeline</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1c1c1f' }}>
                  {['Pipeline', 'Runs', 'Tokens', 'Cost'].map(h => (
                    <th key={h} style={{ padding: '8px 20px', textAlign: h === 'Pipeline' ? 'left' : 'right', color: '#52525b', fontWeight: 500, fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.byPipeline.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < data.byPipeline.length - 1 ? '1px solid #1c1c1f' : 'none' }}>
                    <td style={{ padding: '10px 20px', color: '#e4e4e7' }}>{p.name}</td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', color: '#71717a' }}>{p.runs}</td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', color: '#71717a' }}>{p.tokens.toLocaleString()}</td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', color: '#22d3a0', fontFamily: 'monospace' }}>${p.cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </>
  )
}
