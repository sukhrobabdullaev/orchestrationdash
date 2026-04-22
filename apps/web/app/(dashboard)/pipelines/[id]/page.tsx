import { Topbar } from '@/components/layout/Topbar'
import { StatusPill } from '@/components/ui/StatusPill'
import { RunPipelineButton } from '@/components/pipelines/RunPipelineButton'
import { apiServer } from '@/lib/api-server'
import { type Run } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const ROLE_COLORS: Record<string, string> = {
  pm:         '#7c6aff',
  architect:  '#22d3a0',
  engineer:   '#f59e0b',
  qa:         '#f43f5e',
  researcher: '#38bdf8',
}

function roleColor(role: string) {
  return ROLE_COLORS[role] ?? '#52525b'
}

function orderNodes(
  nodes: { id: string; role: string; model: string; name: string }[],
  edges: { source: string; target: string }[],
) {
  const inCount = new Map(nodes.map(n => [n.id, 0]))
  for (const e of edges) inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1)
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  }
  const queue = nodes.filter(n => (inCount.get(n.id) ?? 0) === 0)
  const ordered: typeof nodes = []
  const byId = new Map(nodes.map(n => [n.id, n]))
  while (queue.length > 0) {
    const cur = queue.shift()!
    ordered.push(cur)
    for (const nid of adj.get(cur.id) ?? []) {
      const c = (inCount.get(nid) ?? 1) - 1
      inCount.set(nid, c)
      if (c === 0) queue.push(byId.get(nid)!)
    }
  }
  return ordered
}

export default async function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [pipeline, runs] = await Promise.all([
    apiServer.pipeline(id).catch(() => null),
    apiServer.runs({ pipelineId: id, limit: '10' }).catch(() => [] as Run[]),
  ])

  if (!pipeline) notFound()

  const nodes = pipeline.definition?.nodes ?? []
  const edges = pipeline.definition?.edges ?? []
  const ordered = orderNodes(nodes, edges)

  return (
    <>
      <Topbar title={pipeline.name} description={pipeline.description ?? 'pipeline canvas'}>
        <RunPipelineButton pipelineId={id} />
      </Topbar>
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Canvas */}
        <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', padding: '32px 24px' }}>
          <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
            Pipeline · {ordered.length} agents
          </div>

          {/* Node row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto', paddingBottom: '8px' }}>
            {ordered.map((node, i) => {
              const color = roleColor(node.role)
              return (
                <div key={node.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {/* Node card */}
                  <div style={{
                    width: '140px',
                    background: '#18181c',
                    border: `1px solid ${color}40`,
                    borderRadius: '8px',
                    padding: '16px',
                    position: 'relative',
                  }}>
                    {/* Step number */}
                    <div style={{
                      position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: '#111114', border: `1px solid ${color}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', color: color,
                    }}>{i + 1}</div>

                    {/* Role badge */}
                    <div style={{
                      fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: color, marginBottom: '6px', fontWeight: 600,
                    }}>{node.role}</div>

                    {/* Name */}
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>
                      {node.name}
                    </div>

                    {/* Model */}
                    <div style={{ fontSize: '10px', color: '#3f3f46', fontFamily: 'monospace' }}>
                      {node.model}
                    </div>
                  </div>

                  {/* Arrow between nodes */}
                  {i < ordered.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', width: '40px', flexShrink: 0 }}>
                      <div style={{ flex: 1, height: '1px', background: '#27272a' }} />
                      <div style={{ color: '#3f3f46', fontSize: '14px', lineHeight: 1 }}>›</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Meta */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'Trigger', value: pipeline.trigger },
              { label: 'ID', value: pipeline.id },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '10px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: '#a1a1aa', fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent runs */}
        <div style={{ background: '#111114', border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>Recent Runs</span>
            <Link href={`/runs?pipelineId=${id}`} style={{ fontSize: '11px', color: '#7c6aff', textDecoration: 'none' }}>view all →</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['Run ID', 'Input', 'Status', 'Tokens', 'Cost', 'Duration', 'Started'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', color: '#52525b', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px 20px', textAlign: 'center', color: '#52525b', fontSize: '12px' }}>no runs yet</td></tr>
              )}
              {runs.map((run: Run) => (
                <tr key={run.id} style={{ borderBottom: '1px solid #1c1c1f' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <Link href={`/runs/${run.id}`} style={{ fontSize: '11px', color: '#7c6aff', textDecoration: 'none', fontFamily: 'monospace' }}>
                      {run.id.slice(-8)}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#e4e4e7', maxWidth: '180px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{run.input}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}><StatusPill status={run.status} /></td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>{run.totalTokens.toLocaleString()}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#7c6aff' }}>${run.totalCostUsd.toFixed(4)}</td>
                  <td style={{ padding: '12px 20px', fontSize: '12px', color: '#a1a1aa' }}>
                    {run.startedAt && run.finishedAt
                      ? `${((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1)}s`
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '11px', color: '#52525b' }}>
                    {run.startedAt ? timeAgo(run.startedAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
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
