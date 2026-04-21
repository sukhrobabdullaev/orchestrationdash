'use client'

import { Topbar } from '@/components/layout/Topbar'
import { Cpu } from 'lucide-react'

interface AgentDef {
  role: string
  label: string
  model: string
  description: string
  tools: string[]
  color: string
}

const AGENTS: AgentDef[] = [
  {
    role: 'pm',
    label: 'PM Agent',
    model: 'gpt-4o-mini',
    description: 'Translates raw input into a structured Product Requirements Document (PRD). Entry point of every pipeline.',
    tools: [],
    color: '#7c6aff',
  },
  {
    role: 'architect',
    label: 'Architect Agent',
    model: 'gpt-4o-mini',
    description: 'Reads the PRD and produces a technical architecture plan: component breakdown, data models, and API contracts.',
    tools: ['web_search'],
    color: '#22d3a0',
  },
  {
    role: 'engineer',
    label: 'Engineer Agent',
    model: 'gpt-4o-mini',
    description: 'Implements the architecture plan. Can read/write sandbox files and execute code snippets.',
    tools: ['read_file', 'write_file', 'code_exec'],
    color: '#f59e0b',
  },
  {
    role: 'qa',
    label: 'QA Agent',
    model: 'gpt-4o-mini',
    description: 'Reviews engineer output for correctness, edge cases, and test coverage. Produces a QA report.',
    tools: ['read_file', 'code_exec'],
    color: '#f43f5e',
  },
  {
    role: 'deploy',
    label: 'Deploy Agent',
    model: 'gpt-4o-mini',
    description: 'Packages and validates the final artifact. Last step in the default pipeline sequence.',
    tools: ['read_file', 'write_file'],
    color: '#38bdf8',
  },
]

const TOOL_COLOR: Record<string, string> = {
  web_search: '#7c6aff',
  read_file:  '#22d3a0',
  write_file: '#f59e0b',
  code_exec:  '#f43f5e',
}

export default function AgentsPage() {
  return (
    <>
      <Topbar title="Agents" description="Built-in agent roles available in pipelines" />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
        {AGENTS.map(agent => (
          <div key={agent.role} style={{
            background: '#111114',
            border: '1px solid #27272a',
            borderRadius: '8px',
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              {/* Icon */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                background: `${agent.color}18`, border: `1px solid ${agent.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Cpu size={16} style={{ color: agent.color }} />
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{agent.label}</span>
                  <span style={{
                    fontSize: '9px', padding: '1px 7px', borderRadius: '3px',
                    background: '#18181c', border: '1px solid #3f3f46',
                    color: '#71717a', fontFamily: 'monospace',
                  }}>{agent.role}</span>
                  <span style={{
                    fontSize: '9px', padding: '1px 7px', borderRadius: '3px',
                    background: '#18181c', border: '1px solid #3f3f46',
                    color: '#a1a1aa', fontFamily: 'monospace',
                  }}>{agent.model}</span>
                </div>

                <p style={{ fontSize: '11px', color: '#71717a', margin: '8px 0 10px', lineHeight: 1.6 }}>
                  {agent.description}
                </p>

                {/* Tool grants */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Tools
                  </span>
                  {agent.tools.length === 0 ? (
                    <span style={{ fontSize: '10px', color: '#3f3f46' }}>none</span>
                  ) : agent.tools.map(t => {
                    const c = TOOL_COLOR[t] ?? '#52525b'
                    return (
                      <span key={t} style={{
                        fontSize: '9px', padding: '1px 7px', borderRadius: '3px',
                        background: `${c}18`, border: `1px solid ${c}40`,
                        color: c, fontFamily: 'monospace',
                      }}>{t}</span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>
    </>
  )
}
