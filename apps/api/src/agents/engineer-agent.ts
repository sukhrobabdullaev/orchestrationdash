import { BaseAgent } from './base-agent.js'
import { extendPool, type MessagePool } from '../lib/message-pool.js'

export class EngineerAgent extends BaseAgent {
  readonly role = 'engineer' as const
  readonly defaultModel = 'gpt-4o-mini'

  async execute(pool: MessagePool): Promise<MessagePool> {
    this.log('reading architecture from message pool')

    const architecture = pool.architecture as string | undefined
    const prd = pool.prd as string | undefined

    if (!architecture) {
      this.warn('no architecture found in pool — using PRD as context')
    }

    const context = [
      prd && `## PRD\n${prd}`,
      architecture && `## Architecture\n${architecture}`,
    ].filter(Boolean).join('\n\n') || `Product idea: ${pool.input}`

    const result = await this.generate(context, {
      system: `You are a senior full-stack engineer. Given a PRD and technical architecture, produce the core implementation code.

Structure your response as:

## File Structure
A tree of the key files to create (max 15 files).

## Core Implementation
The 3-4 most critical files with their full code. Use code blocks with language tags.

## Database Schema
SQL or ORM schema for the main entities.

## Key Algorithms
Any non-trivial logic explained with pseudocode or code.

Be implementation-ready. Use TypeScript. Keep total response under 900 words.`,
    })

    this.log(`implementation written (${result.text.length} chars)`)

    return extendPool(pool, { implementation: result.text })
  }
}
