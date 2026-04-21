import { BaseAgent } from './base-agent.js'
import { extendPool, type MessagePool } from '../lib/message-pool.js'

export class ArchitectAgent extends BaseAgent {
  readonly role = 'architect' as const
  readonly defaultModel = 'gpt-4o-mini'

  async execute(pool: MessagePool): Promise<MessagePool> {
    this.log('reading PRD from message pool')

    const prd = pool.prd as string | undefined
    if (!prd) {
      this.warn('no PRD found in pool — using raw input as context')
    }

    const context = prd ?? `Product idea: ${pool.input}`

    const result = await this.generate(context, {
      system: `You are a senior software architect. Given a Product Requirements Document, produce a concise technical architecture in markdown.

Structure your response as:
## Tech Stack
Table of: Layer | Technology | Reason (3-5 rows covering frontend, backend, database, auth, deployment).

## Data Models
Key entities with their main fields (ERD in text form — no diagrams needed).

## API Design
The 5-8 most important REST endpoints with method, path, and one-line description.

## Component Architecture
How the system is broken into services/modules and how they communicate.

## Key Technical Decisions
2-3 bullet points on non-obvious choices and their rationale.

Be concrete and implementation-ready. Keep the total response under 700 words.`,
    })

    this.log(`architecture written (${result.text.length} chars)`)

    return extendPool(pool, { architecture: result.text })
  }
}
