import { prisma } from '@agentforge/db'
import { sendSlack, sendWebhook, sendEmail, type AlertPayload } from './notifier.js'

export async function evaluateAlerts(workspaceId: string, runId: string) {
  const alerts = await prisma.alert.findMany({
    where: { workspaceId, enabled: true },
  })
  if (alerts.length === 0) return

  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: { totalCostUsd: true, status: true },
  })
  if (!run) return

  for (const alert of alerts) {
    let shouldFire = false
    let detail = ''

    if (alert.type === 'cost_threshold') {
      shouldFire = run.totalCostUsd >= alert.threshold
      detail = `Run cost $${run.totalCostUsd.toFixed(4)} exceeded threshold of $${alert.threshold.toFixed(4)}`
    }

    if (alert.type === 'failure_rate') {
      const recentRuns = await prisma.run.findMany({
        where: { workspaceId, status: { in: ['SUCCESS', 'FAILED'] } },
        orderBy: { createdAt: 'desc' },
        take: alert.windowRuns,
        select: { status: true },
      })
      if (recentRuns.length > 0) {
        const failed = recentRuns.filter(r => r.status === 'FAILED').length
        const rate = (failed / recentRuns.length) * 100
        shouldFire = rate >= alert.threshold
        detail = `Failure rate ${rate.toFixed(1)}% over last ${recentRuns.length} runs (threshold: ${alert.threshold}%)`
      }
    }

    if (!shouldFire) continue

    await prisma.alert.update({
      where: { id: alert.id },
      data: { lastFiredAt: new Date() },
    })

    const payload: AlertPayload = {
      alertName: alert.name,
      alertType: alert.type as 'cost_threshold' | 'failure_rate',
      threshold: alert.threshold,
      workspaceId,
      runId,
      detail,
    }

    // Fire all configured notification channels in parallel
    await Promise.allSettled([
      alert.slackWebhookUrl && sendSlack(alert.slackWebhookUrl, payload),
      alert.webhookUrl      && sendWebhook(alert.webhookUrl, payload),
      alert.emailTo         && sendEmail(alert.emailTo, payload),
    ])

    console.log(`[alerts] fired: ${alert.name} — ${detail}`)
  }
}
