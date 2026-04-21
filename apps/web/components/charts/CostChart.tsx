'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface RunPoint {
  label: string
  cost: number
  tokens: number
  status: string
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: '#22d3a0',
  FAILED:  '#f43f5e',
  RUNNING: '#f59e0b',
  QUEUED:  '#52525b',
}

interface TooltipPayloadItem {
  value: number
  name: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#18181c', border: '1px solid #27272a', borderRadius: '6px', padding: '8px 12px', fontSize: '11px' }}>
      <div style={{ color: '#52525b', marginBottom: '4px' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: '#e4e4e7' }}>
          {p.name}: <span style={{ color: '#7c6aff' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function CostBarChart({ data }: { data: RunPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toFixed(4)}`} width={64} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
        <Bar dataKey="cost" name="cost USD" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={STATUS_COLOR[d.status] ?? '#7c6aff'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TokenBarChart({ data }: { data: RunPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} width={40} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a' }} />
        <Bar dataKey="tokens" name="tokens" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={STATUS_COLOR[d.status] ?? '#7c6aff'} opacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
