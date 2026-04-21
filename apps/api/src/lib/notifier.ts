import nodemailer from 'nodemailer'

export interface AlertPayload {
  alertName: string
  alertType: 'cost_threshold' | 'failure_rate'
  threshold: number
  workspaceId: string
  runId: string
  detail: string
}

// ── Slack ─────────────────────────────────────────────────────────────────────

export async function sendSlack(webhookUrl: string, payload: AlertPayload) {
  const color = payload.alertType === 'cost_threshold' ? '#f59e0b' : '#f43f5e'
  const body = {
    attachments: [{
      color,
      fallback: `AgentForge alert: ${payload.alertName}`,
      title: `🔔 Alert fired: ${payload.alertName}`,
      text: payload.detail,
      fields: [
        { title: 'Type',       value: payload.alertType.replace('_', ' '), short: true },
        { title: 'Threshold',  value: String(payload.threshold),           short: true },
        { title: 'Run ID',     value: payload.runId,                       short: false },
        { title: 'Workspace',  value: payload.workspaceId,                 short: false },
      ],
      footer: 'AgentForge',
      ts: Math.floor(Date.now() / 1000),
    }],
  }
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Generic webhook ───────────────────────────────────────────────────────────

export async function sendWebhook(webhookUrl: string, payload: AlertPayload) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'alert.fired', ...payload, firedAt: new Date().toISOString() }),
  })
}

// ── Email ─────────────────────────────────────────────────────────────────────

export async function sendEmail(to: string, payload: AlertPayload) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[notifier] SMTP not configured — skipping email notification')
    return
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  await transporter.sendMail({
    from: SMTP_FROM ?? SMTP_USER,
    to,
    subject: `[AgentForge] Alert fired: ${payload.alertName}`,
    text: [
      `Alert: ${payload.alertName}`,
      `Type: ${payload.alertType}`,
      `Detail: ${payload.detail}`,
      `Run ID: ${payload.runId}`,
      `Workspace: ${payload.workspaceId}`,
      `Fired at: ${new Date().toISOString()}`,
    ].join('\n'),
    html: `
      <h2 style="color:#7c6aff">🔔 Alert fired: ${payload.alertName}</h2>
      <p>${payload.detail}</p>
      <table>
        <tr><td><b>Type</b></td><td>${payload.alertType}</td></tr>
        <tr><td><b>Run ID</b></td><td><code>${payload.runId}</code></td></tr>
        <tr><td><b>Workspace</b></td><td><code>${payload.workspaceId}</code></td></tr>
        <tr><td><b>Fired at</b></td><td>${new Date().toISOString()}</td></tr>
      </table>
      <p style="color:#71717a;font-size:12px">AgentForge · <a href="http://localhost:3000/alerts">Manage alerts</a></p>
    `,
  })
}
