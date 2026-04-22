'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, BackgroundVariant,
  type NodeMouseHandler, type Node, type Edge, type Connection,
} from '@xyflow/react'
import { Topbar } from '@/components/layout/Topbar'
import { AgentNode, type AgentNodeData } from '@/components/builder/AgentNode'
import { AgentEdge } from '@/components/builder/AgentEdge'
import { ConfigPanel } from '@/components/builder/ConfigPanel'
import { BuilderToolbar } from '@/components/builder/BuilderToolbar'
import type { Pipeline } from '@/lib/api'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
const WORKSPACE_ID = 'cmo66nv1j0000yn9z2pkz97tm'

const nodeTypes = { agent: AgentNode }
const edgeTypes = { agent: AgentEdge }

const DEFAULT_NODES: Node[] = [
  { id: 'node-pm',   type: 'agent', position: { x: 60,  y: 180 }, data: { role: 'pm',       name: 'PM Agent',        model: 'gpt-4o-mini', status: 'idle', systemPrompt: 'You are a product manager. Write a detailed PRD.' } },
  { id: 'node-arch', type: 'agent', position: { x: 280, y: 180 }, data: { role: 'architect', name: 'Architect Agent', model: 'gpt-4o-mini', status: 'idle', systemPrompt: 'You are a software architect. Design the system based on the PRD.' } },
  { id: 'node-eng',  type: 'agent', position: { x: 500, y: 180 }, data: { role: 'engineer',  name: 'Engineer Agent',  model: 'gpt-4o-mini', status: 'idle', systemPrompt: 'You are a senior engineer. Implement the architecture.' } },
  { id: 'node-qa',   type: 'agent', position: { x: 720, y: 180 }, data: { role: 'qa',        name: 'QA Agent',        model: 'gpt-4o-mini', status: 'idle', systemPrompt: 'You are a QA engineer. Write and run tests.' } },
]

const DEFAULT_EDGES: Edge[] = [
  { id: 'e1', type: 'agent', source: 'node-pm',   target: 'node-arch', data: { status: 'waiting' } },
  { id: 'e2', type: 'agent', source: 'node-arch', target: 'node-eng',  data: { status: 'waiting' } },
  { id: 'e3', type: 'agent', source: 'node-eng',  target: 'node-qa',   data: { status: 'waiting' } },
]

function definitionToFlow(pipeline: Pipeline): { nodes: Node[]; edges: Edge[] } {
  const defNodes = pipeline.definition?.nodes ?? []
  const defEdges = pipeline.definition?.edges ?? []
  const nodes: Node[] = defNodes.map((n, i) => ({
    id: n.id, type: 'agent',
    position: { x: 60 + i * 220, y: 180 },
    data: { role: n.role, name: n.name, model: n.model, status: 'idle' },
  }))
  const edges: Edge[] = defEdges.map(e => ({
    id: e.id, type: 'agent', source: e.source, target: e.target, data: { status: 'waiting' },
  }))
  return { nodes, edges }
}

function BuilderPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pipelineName, setPipelineName] = useState('My Pipeline')
  const [trigger, setTrigger] = useState('manual')
  const [cron, setCron] = useState('0 9 * * *')
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const skipDirty = useRef(true)

  // Load from DB on mount — if ?id= param present, fetch that pipeline
  useEffect(() => {
    const id = searchParams.get('id')
    const fetchList = fetch(`${API}/pipelines`).then(r => r.json() as Promise<Pipeline[]>)

    if (id) {
      Promise.all([
        fetch(`${API}/pipelines/${id}`).then(r => r.json() as Promise<Pipeline>),
        fetchList,
      ]).then(([pipeline, list]) => {
        const { nodes: n, edges: e } = definitionToFlow(pipeline)
        setNodes(n); setEdges(e)
        setPipelineName(pipeline.name)
        setTrigger(pipeline.trigger)
        const def = pipeline.definition as { schedule?: { cron?: string } } | undefined
        if (def?.schedule?.cron) setCron(def.schedule.cron)
        setPipelineId(pipeline.id)
        setPipelines(list)
        skipDirty.current = false
      }).catch(() => { fetchList.then(setPipelines).catch(() => {}); skipDirty.current = false })
    } else {
      fetchList.then(list => { setPipelines(list); skipDirty.current = false }).catch(() => { skipDirty.current = false })
    }
  }, [searchParams, setEdges, setNodes])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Track dirty state
  useEffect(() => {
    if (skipDirty.current) return
    setDirty(true)
  }, [nodes, edges, pipelineName, trigger, cron])

  const selectedNode = nodes.find(n => n.id === selectedId)

  const addNode = useCallback((role: string) => {
    const id = `node-${role}-${Date.now()}`
    const names: Record<string, string> = { pm: 'PM Agent', architect: 'Architect Agent', engineer: 'Engineer Agent', qa: 'QA Agent', deploy: 'Deploy Agent', researcher: 'Researcher Agent' }
    setNodes(nds => [...nds, {
      id, type: 'agent',
      position: { x: 60 + nds.length * 220, y: 180 },
      data: { role, name: names[role] ?? `${role} Agent`, model: 'gpt-4o-mini', status: 'idle', systemPrompt: '' },
    }])
    setSelectedId(id)
  }, [setNodes])

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => setSelectedId(node.id), [])
  const onPaneClick = useCallback(() => setSelectedId(null), [])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge(
      { ...connection, id: `e-${connection.source}-${connection.target}`, type: 'agent', data: { status: 'waiting' } },
      eds,
    ))
  }, [setEdges])

  const handleChange = useCallback((nodeId: string, patch: Partial<AgentNodeData>) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))
  }, [setNodes])

  const handleLoad = useCallback((pipeline: Pipeline) => {
    skipDirty.current = true
    const { nodes: n, edges: e } = definitionToFlow(pipeline)
    setNodes(n); setEdges(e)
    setPipelineName(pipeline.name)
    setTrigger(pipeline.trigger)
    const def = pipeline.definition as { schedule?: { cron?: string } } | undefined
    if (def?.schedule?.cron) setCron(def.schedule.cron)
    setPipelineId(pipeline.id)
    setSelectedId(null)
    setDirty(false)
    router.replace(`/builder?id=${pipeline.id}`)
    setTimeout(() => { skipDirty.current = false }, 50)
  }, [setNodes, setEdges, router])

  const handleNew = useCallback(() => {
    skipDirty.current = true
    setNodes(DEFAULT_NODES); setEdges(DEFAULT_EDGES)
    setPipelineName('My Pipeline'); setTrigger('manual'); setCron('0 9 * * *')
    setPipelineId(null); setSelectedId(null); setDirty(false)
    router.replace('/builder')
    setTimeout(() => { skipDirty.current = false }, 50)
  }, [setNodes, setEdges, router])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const definition = {
        nodes: nodes.map(n => {
          const d = n.data as AgentNodeData
          return { id: n.id, name: d.name, role: d.role, model: d.model, systemPrompt: d.systemPrompt ?? '', tools: [] }
        }),
        edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
        ...(trigger === 'schedule' && { schedule: { cron } }),
      }
      const body = { name: pipelineName, trigger, definition, workspaceId: WORKSPACE_ID }

      let savedPipeline: Pipeline
      if (pipelineId) {
        const res = await fetch(`${API}/pipelines/${pipelineId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        savedPipeline = await res.json() as Pipeline
      } else {
        const res = await fetch(`${API}/pipelines`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        savedPipeline = await res.json() as Pipeline
        setPipelineId(savedPipeline.id)
        router.replace(`/builder?id=${savedPipeline.id}`)
      }

      const list = await fetch(`${API}/pipelines`).then(r => r.json()) as Pipeline[]
      setPipelines(list)
      setDirty(false)
    } catch (err) {
      console.error('save failed', err)
    } finally {
      setSaving(false)
    }
  }, [nodes, edges, pipelineName, trigger, cron, pipelineId, router])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="Builder"
        description={pipelineId ? `editing · ${pipelineId.slice(-8)}${dirty ? ' · unsaved' : ''}` : `new pipeline${dirty ? ' · unsaved' : ''}`}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AgentPalette onAdd={addNode} />
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            onNodeClick={onNodeClick} onPaneClick={onPaneClick} onConnect={onConnect}
            fitView fitViewOptions={{ padding: 0.3 }}
            colorMode="dark" style={{ background: '#09090b' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} color="#27272a" gap={24} size={1} />
            <Controls />
            <MiniMap style={{ background: '#111114', border: '1px solid #27272a' }} nodeColor="#7c6aff" maskColor="rgba(9,9,11,0.7)" />
            <BuilderToolbar
              name={pipelineName} trigger={trigger} pipelineId={pipelineId} cron={cron}
              pipelines={pipelines} saving={saving} dirty={dirty}
              onNameChange={n => setPipelineName(n)}
              onTriggerChange={t => setTrigger(t)}
              onCronChange={c => setCron(c)}
              onLoad={handleLoad} onNew={handleNew} onSave={handleSave}
            />
          </ReactFlow>
        </div>
        {selectedNode && (
          <ConfigPanel
            nodeId={selectedNode.id}
            data={selectedNode.data as AgentNodeData}
            onChange={handleChange}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div style={{ padding: '28px', color: '#52525b', fontSize: '12px' }}>Loading builder...</div>}>
      <BuilderPageContent />
    </Suspense>
  )
}

const PALETTE_AGENTS = [
  { role: 'pm',         label: 'PM',         color: '#7c6aff' },
  { role: 'architect',  label: 'Architect',  color: '#22d3a0' },
  { role: 'engineer',   label: 'Engineer',   color: '#f59e0b' },
  { role: 'qa',         label: 'QA',         color: '#f43f5e' },
  { role: 'deploy',     label: 'Deploy',     color: '#a78bfa' },
  { role: 'researcher', label: 'Researcher', color: '#38bdf8' },
]

function AgentPalette({ onAdd }: { onAdd: (role: string) => void }) {
  return (
    <div style={{ width: '72px', flexShrink: 0, background: '#111114', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '8px' }}>
      <div style={{ fontSize: '9px', color: '#3f3f46', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>agents</div>
      {PALETTE_AGENTS.map(({ role, label, color }) => (
        <button key={role} onClick={() => onAdd(role)} title={`Add ${label} Agent`}
          style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#18181c', border: `1px solid ${color}40`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', transition: 'border-color 0.15s, background 0.15s' }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = color; b.style.background = `${color}12` }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = `${color}40`; b.style.background = '#18181c' }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
          <span style={{ fontSize: '8px', color: '#71717a', fontFamily: 'var(--font-mono)' }}>{label}</span>
        </button>
      ))}
    </div>
  )
}
