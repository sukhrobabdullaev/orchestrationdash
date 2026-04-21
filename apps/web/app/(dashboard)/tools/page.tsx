'use client'

import { Topbar } from '@/components/layout/Topbar'
import { Wrench, Globe, FileText, FilePen, Code2 } from 'lucide-react'

interface ToolDef {
  name: string
  label: string
  description: string
  inputSchema: { param: string; type: string; description: string }[]
  icon: React.ElementType
  color: string
}

const TOOLS: ToolDef[] = [
  {
    name: 'web_search',
    label: 'Web Search',
    description: 'Search the web for real-time information via DuckDuckGo. Returns abstract text, answers, or related topics.',
    inputSchema: [
      { param: 'query', type: 'string', description: 'The search query' },
    ],
    icon: Globe,
    color: '#7c6aff',
  },
  {
    name: 'read_file',
    label: 'Read File',
    description: 'Read the contents of a file from the sandboxed directory. Path traversal is blocked.',
    inputSchema: [
      { param: 'filePath', type: 'string', description: 'Relative file path within the sandbox' },
    ],
    icon: FileText,
    color: '#22d3a0',
  },
  {
    name: 'write_file',
    label: 'Write File',
    description: 'Write content to a file in the sandboxed directory. Missing parent directories are created automatically.',
    inputSchema: [
      { param: 'filePath', type: 'string', description: 'Relative file path within the sandbox' },
      { param: 'content',  type: 'string', description: 'File content to write' },
    ],
    icon: FilePen,
    color: '#f59e0b',
  },
  {
    name: 'code_exec',
    label: 'Code Exec',
    description: 'Execute a JavaScript snippet in a sandboxed VM context. No imports or file system access. 3 s timeout.',
    inputSchema: [
      { param: 'code', type: 'string', description: 'JavaScript code to execute' },
    ],
    icon: Code2,
    color: '#f43f5e',
  },
]

export default function ToolsPage() {
  return (
    <>
      <Topbar title="Tools" description="Tool grants available to agents during pipeline execution" />
      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
        {TOOLS.map(tool => {
          const Icon = tool.icon
          return (
            <div key={tool.name} style={{
              background: '#111114',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {/* Icon */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                  background: `${tool.color}18`, border: `1px solid ${tool.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} style={{ color: tool.color }} />
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{tool.label}</span>
                    <span style={{
                      fontSize: '9px', padding: '1px 7px', borderRadius: '3px',
                      background: '#18181c', border: '1px solid #3f3f46',
                      color: '#71717a', fontFamily: 'monospace',
                    }}>{tool.name}</span>
                  </div>

                  <p style={{ fontSize: '11px', color: '#71717a', margin: '8px 0 12px', lineHeight: 1.6 }}>
                    {tool.description}
                  </p>

                  {/* Input schema */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Input schema
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {tool.inputSchema.map(p => (
                        <div key={p.param} style={{
                          display: 'flex', alignItems: 'baseline', gap: '8px',
                          background: '#18181c', borderRadius: '4px', padding: '6px 10px',
                        }}>
                          <span style={{ fontSize: '11px', color: tool.color, fontFamily: 'monospace', flexShrink: 0 }}>{p.param}</span>
                          <span style={{ fontSize: '9px', color: '#52525b', fontFamily: 'monospace', flexShrink: 0 }}>{p.type}</span>
                          <span style={{ fontSize: '11px', color: '#71717a' }}>{p.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Note */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: '#111114', border: '1px solid #27272a', borderRadius: '8px',
          padding: '14px 16px', marginTop: '4px',
        }}>
          <Wrench size={13} style={{ color: '#3f3f46', marginTop: '1px', flexShrink: 0 }} />
          <p style={{ fontSize: '11px', color: '#52525b', margin: 0, lineHeight: 1.6 }}>
            Tool grants are configured per-agent in the pipeline builder. Agents only receive the tools explicitly granted — the LLM cannot call tools outside its grant list.
          </p>
        </div>
      </main>
    </>
  )
}
