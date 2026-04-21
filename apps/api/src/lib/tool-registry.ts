import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

// Sandboxed directory for file tools
const SANDBOX_DIR = path.join(process.cwd(), '.sandbox')
await fs.mkdir(SANDBOX_DIR, { recursive: true })

function sandboxPath(filePath: string) {
  const resolved = path.resolve(SANDBOX_DIR, filePath)
  if (!resolved.startsWith(SANDBOX_DIR)) throw new Error('path traversal not allowed')
  return resolved
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const webSearch = tool({
  description: 'Search the web for up-to-date information on a topic.',
  inputSchema: zodSchema(z.object({
    query: z.string().describe('The search query'),
  })),
  execute: async ({ query }: { query: string }) => {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      const res = await fetch(url, { headers: { 'User-Agent': 'AgentForge/1.0' } })
      const data = await res.json() as { AbstractText?: string; RelatedTopics?: { Text?: string }[]; Answer?: string }
      return data.Answer?.trim() || data.AbstractText?.trim() || data.RelatedTopics?.slice(0, 4).map(t => t.Text).filter(Boolean).join('\n') || `No results for: ${query}`
    } catch (err) {
      return `Search failed: ${err instanceof Error ? err.message : String(err)}`
    }
  },
})

export const readFile = tool({
  description: 'Read the contents of a file from the sandbox directory.',
  inputSchema: zodSchema(z.object({
    filePath: z.string().describe('Relative file path within the sandbox'),
  })),
  execute: async ({ filePath }: { filePath: string }) => {
    try {
      return await fs.readFile(sandboxPath(filePath), 'utf-8')
    } catch (err) {
      return `Error reading file: ${err instanceof Error ? err.message : String(err)}`
    }
  },
})

export const writeFile = tool({
  description: 'Write content to a file in the sandbox directory.',
  inputSchema: zodSchema(z.object({
    filePath: z.string().describe('Relative file path within the sandbox'),
    content: z.string().describe('File content to write'),
  })),
  execute: async ({ filePath, content }: { filePath: string; content: string }) => {
    try {
      const full = sandboxPath(filePath)
      await fs.mkdir(path.dirname(full), { recursive: true })
      await fs.writeFile(full, content, 'utf-8')
      return `Written ${content.length} bytes to ${filePath}`
    } catch (err) {
      return `Error writing file: ${err instanceof Error ? err.message : String(err)}`
    }
  },
})

export const codeExec = tool({
  description: 'Execute a JavaScript snippet and return its output. Safe sandbox — no imports or file system.',
  inputSchema: zodSchema(z.object({
    code: z.string().describe('JavaScript code to execute'),
  })),
  execute: async ({ code }: { code: string }) => {
    try {
      const logs: string[] = []
      const ctx = vm.createContext({
        console: {
          log: (...a: unknown[]) => logs.push(a.map(String).join(' ')),
          error: (...a: unknown[]) => logs.push('ERROR: ' + a.map(String).join(' ')),
        },
        Math, JSON, Array, Object, String, Number, Boolean, Date,
      })
      const result = vm.runInContext(code, ctx, { timeout: 3000 })
      return logs.join('\n') || (result !== undefined ? String(result) : '(no output)')
    } catch (err) {
      return `Execution error: ${err instanceof Error ? err.message : String(err)}`
    }
  },
})

// ── Registry ─────────────────────────────────────────────────────────────────

export const TOOLS = {
  web_search: webSearch,
  read_file:  readFile,
  write_file: writeFile,
  code_exec:  codeExec,
} as const

export type ToolName = keyof typeof TOOLS

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  web_search: 'Search the web for real-time information',
  read_file:  'Read files from the sandbox directory',
  write_file: 'Write files to the sandbox directory',
  code_exec:  'Execute JavaScript snippets safely',
}

export function getTools(grants: string[]) {
  return Object.fromEntries(
    grants
      .filter((g): g is ToolName => g in TOOLS)
      .map(g => [g, TOOLS[g]])
  )
}
