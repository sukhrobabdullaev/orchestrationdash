'use client'

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export type EdgeStatus = 'waiting' | 'active' | 'done' | 'failed'

export interface AgentEdgeData {
  status?: EdgeStatus
  [key: string]: unknown
}

const EDGE_COLOR: Record<EdgeStatus, string> = {
  waiting: '#3f3f46',
  active:  '#7c6aff',
  done:    '#22d3a0',
  failed:  '#f43f5e',
}

export function AgentEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, markerEnd,
}: EdgeProps) {
  const d = data as AgentEdgeData
  const status: EdgeStatus = d?.status ?? 'waiting'
  const color = EDGE_COLOR[status]
  const isActive = status === 'active'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 8,
  })

  return (
    <>
      {/* Glow track for active */}
      {isActive && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{ stroke: color, strokeWidth: 6, strokeOpacity: 0.15, fill: 'none' }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: isActive ? 2 : 1.5,
          strokeDasharray: status === 'waiting' ? '5 4' : 'none',
          strokeOpacity: status === 'waiting' ? 0.5 : 1,
          fill: 'none',
          animation: isActive ? 'dashdraw 0.8s linear infinite' : 'none',
        }}
      />

      {/* Status label */}
      {status !== 'waiting' && (
        <EdgeLabelRenderer>
          <div style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: '9px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color,
            background: '#09090b',
            padding: '1px 5px',
            borderRadius: '3px',
            border: `1px solid ${color}40`,
            pointerEvents: 'none',
            fontFamily: 'var(--font-mono)',
          }}>
            {status}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
