import { BaseAgent } from './base-agent.js'
import { extendPool, type MessagePool } from '../lib/message-pool.js'

export class PMAgent extends BaseAgent {
  readonly role = 'pm' as const
  readonly defaultModel = 'gpt-4o-mini'

  async execute(pool: MessagePool): Promise<MessagePool> {
    this.log(`starting — input: "${pool.input}"`)

    const result = await this.generate(pool.input as string, {
      system: `You are a senior product manager. Given a product idea, produce a concise Product Requirements Document (PRD) in markdown.

Structure your PRD as:
## Overview
One paragraph summary of the product.

## Problem Statement
What pain point does this solve?

## User Stories
3-5 user stories in "As a [user], I want to [action] so that [benefit]" format.

## Core Features
Bulleted list of must-have features for v1.

## Out of Scope
What is explicitly excluded from v1.

Be specific and actionable. Keep the total response under 600 words.`,
    })

    this.log(`PRD written (${result.text.length} chars)`)

    return extendPool(pool, { prd: result.text })
  }
}
