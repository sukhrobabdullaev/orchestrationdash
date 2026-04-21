import { BaseAgent } from './base-agent.js'
import { extendPool, type MessagePool } from '../lib/message-pool.js'

export class QAAgent extends BaseAgent {
  readonly role = 'qa' as const
  readonly defaultModel = 'gpt-4o-mini'

  async execute(pool: MessagePool): Promise<MessagePool> {
    this.log('reading implementation from message pool')

    const implementation = pool.implementation as string | undefined
    const architecture = pool.architecture as string | undefined
    const prd = pool.prd as string | undefined

    if (!implementation) {
      this.warn('no implementation found in pool — validating architecture only')
    }

    const context = [
      prd && `## PRD\n${prd}`,
      architecture && `## Architecture\n${architecture}`,
      implementation && `## Implementation\n${implementation}`,
    ].filter(Boolean).join('\n\n') || `Product idea: ${pool.input}`

    const result = await this.generate(context, {
      system: `You are a senior QA engineer. Given a PRD, architecture, and implementation, produce a comprehensive test plan and validation report.

Structure your response as:

## Test Plan
### Unit Tests
List the 5-8 most critical unit tests with: test name, what it tests, expected outcome.

### Integration Tests
List 3-5 integration test scenarios covering key user flows.

### Edge Cases
List 4-6 edge cases that must be handled.

## Validation Report
### PRD Coverage
Which user stories from the PRD are covered by the implementation? Which are missing?

### Risk Assessment
Top 3 risks ranked by severity (High/Medium/Low) with mitigation.

## Test Code
Write 2-3 actual test functions in TypeScript using Vitest syntax for the most critical paths.

Be specific and actionable. Keep total response under 800 words.`,
    })

    this.log(`QA report written (${result.text.length} chars)`)

    return extendPool(pool, { qaReport: result.text })
  }
}
