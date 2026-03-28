/**
 * Email sending via Resend SDK.
 * Falls back gracefully if RESEND_API_KEY is not configured.
 */

interface PaymentReminderData {
  to: string
  subject: string
  payments: Array<{
    payee: string
    amount: number
    project: string
    invoiceNumber: string
  }>
  dueDate: string
  tier: '3d' | '1d' | 'today'
}

export async function sendPaymentReminder(data: PaymentReminderData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL not configured — skipping email')
    return false
  }

  const totalAmount = data.payments.reduce((sum, p) => sum + p.amount, 0)

  const rows = data.payments
    .map(p => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${p.payee}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">A$${p.amount.toLocaleString()}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${p.project}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${p.invoiceNumber}</td></tr>`)
    .join('')

  const urgencyColor = data.tier === 'today' ? '#dc2626' : data.tier === '1d' ? '#f59e0b' : '#2563eb'

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${urgencyColor};color:white;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">${data.subject}</h2>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px">
        <p style="margin:0 0 16px;color:#64748b">
          ${data.payments.length} payments totaling <strong>A$${totalAmount.toLocaleString()}</strong>
          are due on <strong>${data.dueDate}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:8px;text-align:left;font-size:12px;color:#94a3b8;text-transform:uppercase">Payee</th>
              <th style="padding:8px;text-align:right;font-size:12px;color:#94a3b8;text-transform:uppercase">Amount</th>
              <th style="padding:8px;text-align:left;font-size:12px;color:#94a3b8;text-transform:uppercase">Project</th>
              <th style="padding:8px;text-align:left;font-size:12px;color:#94a3b8;text-transform:uppercase">Invoice</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:24px;text-align:center">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/payments"
             style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
            View Payments
          </a>
        </div>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: data.to,
        subject: data.subject,
        html,
      }),
    })

    if (!res.ok) {
      console.error('[email] Resend API error:', res.status, await res.text())
      return false
    }

    return true
  } catch (err) {
    console.error('[email] Failed to send:', err)
    return false
  }
}

// ── Scheduled Report Email ────────────────────────────────────────────────

interface ReportEmailData {
  to: string
  subject: string
  reportType: string
  summary: string
  tableHtml: string
}

export async function sendReportEmail(data: ReportEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL not configured — skipping report email')
    return false
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:640px;margin:0 auto">
      <div style="background:#1e40af;color:white;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">Hylink Finance</h2>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px">
        <h3 style="margin:0 0 8px;font-size:16px;color:#1a202c">${data.reportType}</h3>
        <p style="margin:0 0 20px;color:#64748b;font-size:14px">${data.summary}</p>
        ${data.tableHtml}
        <div style="margin-top:24px;text-align:center">
          <a href="${siteUrl}/reports"
             style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
            View Full Report
          </a>
        </div>
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center">
          This is an automated report from Hylink Finance Tracker.
        </p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: data.to,
        subject: data.subject,
        html,
      }),
    })

    if (!res.ok) {
      console.error('[email] Report email Resend API error:', res.status, await res.text())
      return false
    }

    return true
  } catch (err) {
    console.error('[email] Failed to send report email:', err)
    return false
  }
}
