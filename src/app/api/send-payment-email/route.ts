import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ALLOWED_ROLES = ['Controller', 'Admin', 'Super Admin']

interface RequestBody {
  expense_ids: string[]
  type: 'payment'
  to_emails: string[]
  cc_emails?: string[]
  note?: string
}

export async function POST(request: NextRequest) {
  // 1. Validate RESEND_API_KEY is configured
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: 'Email service not configured. Please set RESEND_API_KEY and RESEND_FROM_EMAIL.' },
      { status: 500 }
    )
  }

  // 2. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'errors.notLoggedIn' }, { status: 401 })
  }

  const adminClient = db()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single<{ role: string; full_name: string | null }>()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'errors.noPermission' }, { status: 403 })
  }

  // 3. Parse request body
  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { expense_ids, to_emails, cc_emails, note } = body

  if (!expense_ids || expense_ids.length === 0) {
    return NextResponse.json({ error: 'No expenses selected' }, { status: 400 })
  }
  if (!to_emails || to_emails.length === 0) {
    return NextResponse.json({ error: 'No recipients specified' }, { status: 400 })
  }

  // 4. Query selected expenses with project + brand info
  const { data: expenses, error: queryError } = await adminClient
    .from('expenses')
    .select(`
      id, payee, description, invoice_number, amount, status,
      payment_due_date, attachment_url, email_sent_count,
      projects!inner(name, brand_id, brands(name))
    `)
    .in('id', expense_ids)

  if (queryError) {
    console.error('[send-payment-email] Query error:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!expenses || expenses.length === 0) {
    return NextResponse.json({ error: 'No expenses found' }, { status: 404 })
  }

  // 5. Calculate total
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const today = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })

  // 6. Build subject
  const subject = `[Hylink] Payment Request - ${today} - ${expenses.length} items - Total A$${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`

  // 7. Download attachments from Supabase Storage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attachments: Array<{ filename: string; content: string }> = []

  for (const expense of expenses) {
    if (expense.attachment_url) {
      try {
        // attachment_url is the storage path (e.g., "ProjectCode_timestamp_file.pdf")
        const { data: fileData, error: dlError } = await adminClient
          .storage
          .from('invoices')
          .download(expense.attachment_url)

        if (dlError || !fileData) {
          console.warn(`[send-payment-email] Failed to download attachment for expense ${expense.id}:`, dlError)
          continue
        }

        const buffer = Buffer.from(await fileData.arrayBuffer())
        const base64 = buffer.toString('base64')
        const filename = expense.attachment_url.split('/').pop() || `invoice_${expense.id}`

        attachments.push({
          filename,
          content: base64,
        })
      } catch (err) {
        console.warn(`[send-payment-email] Error downloading attachment for expense ${expense.id}:`, err)
      }
    }
  }

  // 8. Build HTML email body
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  const rows = expenses
    .map((e, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = e.projects as any
      const projectName = project?.name || '—'
      const brandName = project?.brands?.name || '—'
      const amount = Number(e.amount)
      const dueDate = e.payment_due_date
        ? new Date(e.payment_due_date + 'T00:00:00').toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—'

      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">${i + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${brandName} / ${projectName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${e.payee}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${e.invoice_number || '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-variant-numeric:tabular-nums">A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${dueDate}</td>
        </tr>
      `
    })
    .join('')

  const noteSection = note
    ? `<div style="margin:16px 0;padding:12px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:13px;color:#92400e"><strong>Note:</strong> ${note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
    : ''

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,sans-serif;max-width:700px;margin:0 auto;background:#ffffff">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1A365D 0%,#2B6CB0 100%);color:white;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px;font-weight:600;letter-spacing:-0.02em">Hylink Finance Tracker</h1>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.85">Payment Request Notification</p>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 8px 8px">
        <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6">
          ${expenses.length} payment${expenses.length > 1 ? 's' : ''} totaling
          <strong style="color:#1A365D">A$${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</strong>
          require${expenses.length === 1 ? 's' : ''} processing.
        </p>

        ${noteSection}

        <!-- Table -->
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:20px 0">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">#</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Project</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Supplier</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Invoice No.</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Amount</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr style="background:#f0f7ff">
              <td colspan="4" style="padding:12px;font-weight:600;font-size:13px;color:#1A365D">Total</td>
              <td style="padding:12px;text-align:right;font-weight:700;font-size:14px;color:#1A365D;font-variant-numeric:tabular-nums">A$${totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</td>
              <td style="padding:12px"></td>
            </tr>
          </tfoot>
        </table>

        <!-- CTA Button -->
        <div style="text-align:center;margin:28px 0 12px">
          <a href="${siteUrl}/payments"
             style="display:inline-block;background:#2B6CB0;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px">
            View in System
          </a>
        </div>

        <!-- Footer -->
        <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">
            Hylink Australia &nbsp;|&nbsp; Automated message from Hylink Finance Tracker
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">
            Sent by ${profile.full_name || user.email}
          </p>
        </div>
      </div>
    </div>
  `

  // 9. Send via Resend API
  try {
    const emailPayload: Record<string, unknown> = {
      from: fromEmail,
      to: to_emails,
      subject,
      html,
    }

    if (cc_emails && cc_emails.length > 0) {
      emailPayload.cc = cc_emails
    }

    if (attachments.length > 0) {
      emailPayload.attachments = attachments
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[send-payment-email] Resend API error:', res.status, errorText)

      // Log failure
      for (const expense of expenses) {
        await adminClient.from('email_logs').insert({
          expense_id: expense.id,
          email_type: 'payment_batch',
          to_emails,
          cc_emails: cc_emails || [],
          subject,
          status: 'failed',
          error_message: `Resend API ${res.status}: ${errorText}`,
          sent_by: user.id,
        })
      }

      return NextResponse.json({ error: `Email sending failed: ${errorText}` }, { status: 502 })
    }

    // 10. Log success to email_logs + update expenses
    const now = new Date().toISOString()

    for (const expense of expenses) {
      // Insert email log
      await adminClient.from('email_logs').insert({
        expense_id: expense.id,
        email_type: 'payment_batch',
        to_emails,
        cc_emails: cc_emails || [],
        subject,
        status: 'sent',
        sent_by: user.id,
        sent_at: now,
      })

      // Update expense email tracking fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentCount = (expense as any).email_sent_count as number || 0
      await adminClient
        .from('expenses')
        .update({
          last_email_sent_at: now,
          email_sent_count: currentCount + 1,
        })
        .eq('id', expense.id)
    }

    return NextResponse.json({
      success: true,
      count: expenses.length,
      total: totalAmount,
    })
  } catch (err) {
    console.error('[send-payment-email] Failed to send:', err)

    // Log failure
    for (const expense of expenses) {
      await adminClient.from('email_logs').insert({
        expense_id: expense.id,
        email_type: 'payment_batch',
        to_emails,
        cc_emails: cc_emails || [],
        subject,
        status: 'failed',
        error_message: (err as Error).message,
        sent_by: user.id,
      })
    }

    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
