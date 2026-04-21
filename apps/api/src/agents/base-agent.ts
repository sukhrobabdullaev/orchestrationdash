import { EventEmitter } from 'node:events'
import { generate, stream, type LLMResult, type GenerateOptions, type StreamChunk } from '../lib/llm-router.js'
import { getTools } from '../lib/tool-registry.js'
import { type MessagePool } from '../lib/message-pool.js'
import type { AgentRole, LogLevel } from '@agentforge/types'

export interface LogEvent {
  level: LogLevel
  message: string
}

export interface UsageEvent {
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export abstract class BaseAgent extends EventEmitter {
  abstract readonly role: AgentRole
  abstract readonly defaultModel: string

  private readonly model: string
  protected toolGrants: string[] = []

  constructor(modelOverride?: string, toolGrants: string[] = []) {
    super()
    this.model = modelOverride ?? ''
    this.toolGrants = toolGrants
  }

  protected getModel(): string {
    return this.model || this.defaultModel
  }

  // ── Core execution ────────────────────────────────────────────────────────

  abstract execute(pool: MessagePool): Promise<MessagePool>

  // ── LLM helpers ───────────────────────────────────────────────────────────

  protected async generate(prompt: string, options: GenerateOptions = {}): Promise<LLMResult> {
    const tools = this.toolGrants.length > 0 ? getTools(this.toolGrants) : undefined
    if (tools && Object.keys(tools).length > 0) {
      this.log(`tools available: ${Object.keys(tools).join(', ')}`)
      options = { ...options, tools }
    }
    this.log(`sending prompt (${prompt.length} chars) → ${this.getModel()}`)
    const result = await generate(this.getModel(), prompt, options)
    this.log(
      `received response · ${result.usage.inputTokens}→${result.usage.outputTokens} tokens · $${result.usage.costUsd.toFixed(6)}`,
    )
    this.emit('usage', {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.usage.costUsd,
    } satisfies UsageEvent)
    return result
  }

  protected stream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<StreamChunk> {
    this.log(`streaming prompt → ${this.getModel()}`)
    return stream(this.getModel(), prompt, options)
  }

  // ── Logging ───────────────────────────────────────────────────────────────

  protected log(message: string): void {
    this.emit('log', { level: 'info', message: `[${this.role}] ${message}` } satisfies LogEvent)
  }

  protected warn(message: string): void {
    this.emit('log', { level: 'warn', message: `[${this.role}] ${message}` } satisfies LogEvent)
  }

  protected error(message: string): void {
    this.emit('log', { level: 'error', message: `[${this.role}] ${message}` } satisfies LogEvent)
  }
}
