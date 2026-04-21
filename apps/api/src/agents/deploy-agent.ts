import { BaseAgent } from './base-agent.js'
import { extendPool, type MessagePool } from '../lib/message-pool.js'

export class DeployAgent extends BaseAgent {
  readonly role = 'deploy' as const
  readonly defaultModel = 'gpt-4o-mini'

  async execute(pool: MessagePool): Promise<MessagePool> {
    this.log('preparing deployment from pipeline output')

    const implementation = pool.implementation as string | undefined
    const qaReport = pool.qaReport as string | undefined
    const architecture = pool.architecture as string | undefined

    if (!implementation) {
      this.warn('no implementation in pool — generating deployment plan from architecture only')
    }

    const context = [
      architecture && `## Architecture\n${architecture}`,
      implementation && `## Implementation\n${implementation}`,
      qaReport && `## QA Report\n${qaReport}`,
    ].filter(Boolean).join('\n\n') || `Product idea: ${pool.input}`

    const result = await this.generate(context, {
      system: `You are a senior DevOps engineer. Given the implementation and QA report, produce a production deployment plan.

Structure your response as:

## Pre-deployment Checklist
5-8 items that must be verified before deploying (env vars, migrations, secrets, etc.).

## Deployment Steps
Numbered steps to deploy to production. Include commands where applicable.

## Infrastructure
What cloud resources are needed (compute, database, cache, CDN, etc.) with estimated monthly cost.

## Rollback Plan
How to roll back if deployment fails — specific commands or steps.

## Monitoring
3-4 key metrics to watch post-deploy with alert thresholds.

Be specific and actionable. Keep total response under 700 words.`,
    })

    this.log(`deployment plan written (${result.text.length} chars)`)

    // Fire outbound webhook if configured in pool
    const webhookUrl = pool.deployWebhookUrl as string | undefined
    let webhookResult: Record<string, unknown> | null = null

    if (webhookUrl) {
      this.log(`firing deploy webhook → ${webhookUrl}`)
      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'deploy.ready',
            runId: pool.runId,
            input: pool.input,
            deploymentPlan: result.text,
            timestamp: new Date().toISOString(),
          }),
        })
        webhookResult = { status: resp.status, ok: resp.ok }
        this.log(`webhook response → ${resp.status} ${resp.ok ? 'OK' : 'FAILED'}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.warn(`webhook failed: ${msg}`)
        webhookResult = { error: msg }
      }
    } else {
      this.log('no deployWebhookUrl in pool — skipping outbound webhook')
    }

    return extendPool(pool, {
      deploymentPlan: result.text,
      ...(webhookResult && { webhookResult }),
    })
  }
}
