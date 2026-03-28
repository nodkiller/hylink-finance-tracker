import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notify, notifyRoles } from '@/lib/notify'
import { sendPaymentReminder, sendReportEmail } from '@/lib/email'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Vercel Cron handler — runs daily at 01:00 UTC (09:00 CST)
 * 1. Checks for upcoming payment dates and sends reminders.
 * 2. Processes scheduled report deliveries.
 */
export async function GET(request: Request) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  // ── Payment Reminders ───────────────────────────────────────────────────
  try {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const day = today.getUTCDate()
    const month = today.getUTCMonth()
    const year = today.getUTCFullYear()

    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    const day15 = 15
    const day30 = Math.min(30, lastDayOfMonth)

    let reminderDueDate: string | null = null
    let tier: '3d' | '1d' | 'today' | null = null

    if (day === day15 - 3 || day === day30 - 3) {
      tier = '3d'
      reminderDueDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day <= 15 ? day15 : day30).padStart(2, '0')}`
    } else if (day === day15 - 1 || day === day30 - 1) {
      tier = '1d'
      reminderDueDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day <= 15 ? day15 : day30).padStart(2, '0')}`
    } else if (day === day15 || day === day30) {
      tier = 'today'
      reminderDueDate = todayStr
    }

    if (!tier || !reminderDueDate) {
      results.paymentReminders = { message: 'No reminder needed today', day }
    } else {
      const { data: expenses, error: queryError } = await db()
        .from('expenses')
        .select('id, payee, amount, description, invoice_number, project_id, projects(name)')
        .eq('payment_due_date', reminderDueDate)
        .in('status', ['Approved', 'Pending Approval', 'Pending Super Approval'])

      if (queryError) throw queryError

      if (!expenses || expenses.length === 0) {
        results.paymentReminders = { message: 'No pending expenses for this date', date: reminderDueDate }
      } else {
        const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
        const referenceId = `payment_reminder_${reminderDueDate}_${tier}`

        let title: string
        if (tier === '3d') {
          title = `${expenses.length} payments (A$${totalAmount.toLocaleString()}) due on ${reminderDueDate}`
        } else if (tier === '1d') {
          title = `Urgent: ${expenses.length} payments due tomorrow (${reminderDueDate})`
        } else {
          title = `Payments due today: ${expenses.length} items, A$${totalAmount.toLocaleString()}`
        }

        await notifyRoles(
          ['Controller', 'Admin', 'Super Admin'],
          null,
          {
            type: 'payment_reminder',
            title,
            body: `${expenses.length} payments totaling A$${totalAmount.toLocaleString()}`,
            link: '/payments',
            reference_id: referenceId,
          }
        )

        const { data: admins } = await db()
          .from('profiles')
          .select('id, auth_users:id(email)')
          .in('role', ['Controller', 'Admin', 'Super Admin'])

        if (admins) {
          for (const admin of admins) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const email = (admin as any).auth_users?.email
            if (email) {
              await sendPaymentReminder({
                to: email,
                subject: title,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                payments: expenses.map((e: any) => ({
                  payee: e.payee,
                  amount: Number(e.amount),
                  project: e.projects?.name || '',
                  invoiceNumber: e.invoice_number,
                })),
                dueDate: reminderDueDate,
                tier,
              })
            }
          }
        }

        results.paymentReminders = {
          message: `Sent ${tier} reminder for ${reminderDueDate}`,
          expenseCount: expenses.length,
          totalAmount,
        }
      }
    }
  } catch (error) {
    console.error('[cron] Payment reminder failed:', error)
    results.paymentReminders = { error: (error as Error).message }

    try {
      await notifyRoles(
        ['Super Admin'],
        null,
        {
          type: 'system_error',
          title: 'Payment reminder cron failed — manual check needed',
          body: `Error: ${(error as Error).message}`,
          link: '/payments',
        }
      )
    } catch {
      console.error('[cron] Failed to notify about cron failure')
    }
  }

  // ── Report Schedule Delivery ────────────────────────────────────────────
  try {
    // Use UTC+8 for schedule matching
    const utc8Now = new Date(Date.now() + 8 * 3600 * 1000)
    const currentHour = utc8Now.getUTCHours()
    const currentDow = utc8Now.getUTCDay()   // 0=Sun, 6=Sat
    const currentDom = utc8Now.getUTCDate()   // 1-31

    const { data: schedules, error: scheduleError } = await db()
      .from('report_schedules')
      .select('*')
      .eq('enabled', true)
      .eq('hour', currentHour)

    if (scheduleError) throw scheduleError

    let sent = 0
    let skipped = 0

    for (const schedule of (schedules ?? [])) {
      // Check frequency match
      if (schedule.frequency === 'weekly' && schedule.day_of_week !== currentDow) {
        skipped++
        continue
      }
      if (schedule.frequency === 'monthly' && schedule.day_of_month !== currentDom) {
        skipped++
        continue
      }

      try {
        // Generate report data
        const { reportType, subject, summary, tableHtml } = await generateReportData(
          schedule.report_type,
          schedule.locale || 'en'
        )

        // Send to each recipient
        for (const recipient of (schedule.recipients ?? [])) {
          await sendReportEmail({
            to: recipient,
            subject,
            reportType,
            summary,
            tableHtml,
          })
        }

        // Update last_sent_at
        await db()
          .from('report_schedules')
          .update({ last_sent_at: new Date().toISOString(), last_error: null })
          .eq('id', schedule.id)

        sent++
      } catch (err) {
        console.error(`[cron] Report delivery failed for schedule ${schedule.id}:`, err)

        // Record the error
        await db()
          .from('report_schedules')
          .update({ last_error: (err as Error).message })
          .eq('id', schedule.id)
      }
    }

    results.reportSchedules = { sent, skipped, totalMatched: (schedules ?? []).length }
  } catch (err) {
    console.error('[cron] Report delivery failed:', err)
    results.reportSchedules = { error: (err as Error).message }
  }

  return NextResponse.json(results)
}

// ── Report Data Generation ────────────────────────────────────────────────

async function generateReportData(
  reportType: string,
  locale: string
): Promise<{ reportType: string; subject: string; summary: string; tableHtml: string }> {
  const admin = db()
  const isZh = locale === 'zh'

  if (reportType === 'brand_pl') {
    // Brand P&L
    const [{ data: revenues }, { data: expenses }] = await Promise.all([
      admin.from('revenues')
        .select('amount, status, projects(brands(name))'),
      admin.from('expenses')
        .select('amount, status, projects(brands(name))'),
    ])

    const brandMap: Record<string, { revenue: number; expenses: number }> = {}

    for (const r of (revenues ?? [])) {
      if (r.status !== 'Paid') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brandName = (r as any).projects?.brands?.name ?? 'Unknown'
      if (!brandMap[brandName]) brandMap[brandName] = { revenue: 0, expenses: 0 }
      brandMap[brandName].revenue += Number(r.amount)
    }

    for (const e of (expenses ?? [])) {
      if (!['Approved', 'Paid'].includes(e.status)) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brandName = (e as any).projects?.brands?.name ?? 'Unknown'
      if (!brandMap[brandName]) brandMap[brandName] = { revenue: 0, expenses: 0 }
      brandMap[brandName].expenses += Number(e.amount)
    }

    const rows = Object.entries(brandMap)
      .map(([brand, { revenue, expenses }]) => ({
        brand,
        revenue,
        expenses,
        profit: revenue - expenses,
        margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit)

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
    const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0)
    const totalProfit = totalRevenue - totalExpenses
    const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'

    const tableRows = rows.map(r =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${r.brand}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">A$${r.revenue.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">A$${r.expenses.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;color:${r.profit >= 0 ? '#38A169' : '#E53E3E'}">A$${r.profit.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${r.margin.toFixed(1)}%</td>
      </tr>`
    ).join('')

    const headerLabels = isZh
      ? ['品牌', '收入', '支出', '利润', '利润率']
      : ['Brand', 'Revenue', 'Expenses', 'Profit', 'Margin']

    const tableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f8fafc">
            ${headerLabels.map(h => `<th style="padding:8px;text-align:${h === headerLabels[0] ? 'left' : 'right'};font-size:12px;color:#94a3b8;text-transform:uppercase">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `

    return {
      reportType: isZh ? '品牌损益表' : 'Brand P&L Report',
      subject: isZh
        ? `Hylink 报表：品牌损益总览`
        : `Hylink Report: Brand P&L Summary`,
      summary: isZh
        ? `${rows.length} 个品牌，总收入 A$${totalRevenue.toLocaleString()}，平均利润率 ${avgMargin}%`
        : `${rows.length} brands, total revenue A$${totalRevenue.toLocaleString()}, margin ${avgMargin}%`,
      tableHtml,
    }
  }

  if (reportType === 'payment_aging') {
    // Payment Aging
    const { data: expenses } = await db()
      .from('expenses')
      .select('id, amount, status, payee, payment_due_date')
      .in('status', ['Approved', 'Pending Approval', 'Pending Super Approval'])

    const now = new Date()
    const buckets: Record<string, { count: number; total: number }> = {
      current: { count: 0, total: 0 },
      '1-30': { count: 0, total: 0 },
      '31-60': { count: 0, total: 0 },
      '61-90': { count: 0, total: 0 },
      '90+': { count: 0, total: 0 },
      'no_date': { count: 0, total: 0 },
    }

    for (const e of (expenses ?? [])) {
      const amt = Number(e.amount)
      if (!e.payment_due_date) {
        buckets['no_date'].count++
        buckets['no_date'].total += amt
        continue
      }
      const dueDate = new Date(e.payment_due_date)
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays <= 0) {
        buckets['current'].count++
        buckets['current'].total += amt
      } else if (diffDays <= 30) {
        buckets['1-30'].count++
        buckets['1-30'].total += amt
      } else if (diffDays <= 60) {
        buckets['31-60'].count++
        buckets['31-60'].total += amt
      } else if (diffDays <= 90) {
        buckets['61-90'].count++
        buckets['61-90'].total += amt
      } else {
        buckets['90+'].count++
        buckets['90+'].total += amt
      }
    }

    const bucketLabels = isZh
      ? { current: '未到期', '1-30': '1-30天', '31-60': '31-60天', '61-90': '61-90天', '90+': '90+天', no_date: '无到期日' }
      : { current: 'Current', '1-30': '1-30 days', '31-60': '31-60 days', '61-90': '61-90 days', '90+': '90+ days', no_date: 'No Due Date' }

    const tableRows = Object.entries(buckets)
      .filter(([, v]) => v.count > 0)
      .map(([key, v]) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0">${bucketLabels[key as keyof typeof bucketLabels]}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${v.count}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">A$${v.total.toLocaleString()}</td>
        </tr>`
      ).join('')

    const totalCount = (expenses ?? []).length
    const totalAmount = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)

    const headerLabels = isZh
      ? ['账期区间', '数量', '金额']
      : ['Aging Bucket', 'Count', 'Amount']

    const tableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f8fafc">
            ${headerLabels.map((h, i) => `<th style="padding:8px;text-align:${i === 0 ? 'left' : 'right'};font-size:12px;color:#94a3b8;text-transform:uppercase">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `

    return {
      reportType: isZh ? '付款账龄分析' : 'Payment Aging Report',
      subject: isZh
        ? `Hylink 报表：付款账龄分析`
        : `Hylink Report: Payment Aging Analysis`,
      summary: isZh
        ? `${totalCount} 条待付款记录，合计 A$${totalAmount.toLocaleString()}`
        : `${totalCount} outstanding payments, total A$${totalAmount.toLocaleString()}`,
      tableHtml,
    }
  }

  // project_profitability
  const [{ data: revenues }, { data: expenses }, { data: projects }] = await Promise.all([
    db().from('revenues').select('amount, status, project_id'),
    db().from('expenses').select('amount, status, project_id'),
    db().from('projects').select('id, name, project_code, brands(name)'),
  ])

  const projectMap: Record<string, { name: string; brand: string; revenue: number; expenses: number }> = {}

  for (const p of (projects ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandName = (p as any).brands?.name ?? 'Unknown'
    projectMap[p.id] = { name: p.name, brand: brandName, revenue: 0, expenses: 0 }
  }

  for (const r of (revenues ?? [])) {
    if (r.status !== 'Paid' || !projectMap[r.project_id]) continue
    projectMap[r.project_id].revenue += Number(r.amount)
  }

  for (const e of (expenses ?? [])) {
    if (!['Approved', 'Paid'].includes(e.status) || !projectMap[e.project_id]) continue
    projectMap[e.project_id].expenses += Number(e.amount)
  }

  const rows = Object.values(projectMap)
    .filter(p => p.revenue > 0 || p.expenses > 0)
    .map(p => ({
      ...p,
      profit: p.revenue - p.expenses,
      margin: p.revenue > 0 ? ((p.revenue - p.expenses) / p.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 15) // Top 15

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)

  const tableRows = rows.map((r, i) =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${r.name}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${r.brand}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">A$${r.revenue.toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;color:${r.profit >= 0 ? '#38A169' : '#E53E3E'}">${r.margin.toFixed(1)}%</td>
    </tr>`
  ).join('')

  const headerLabels = isZh
    ? ['#', '项目', '品牌', '收入', '利润率']
    : ['#', 'Project', 'Brand', 'Revenue', 'Margin']

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f8fafc">
          ${headerLabels.map((h, i) => `<th style="padding:8px;text-align:${i >= 3 ? 'right' : 'left'};font-size:12px;color:#94a3b8;text-transform:uppercase">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `

  return {
    reportType: isZh ? '项目利润率排名' : 'Project Profitability Ranking',
    subject: isZh
      ? `Hylink 报表：项目利润率排名`
      : `Hylink Report: Project Profitability Ranking`,
    summary: isZh
      ? `${rows.length} 个项目，总收入 A$${totalRevenue.toLocaleString()}`
      : `${rows.length} projects, total revenue A$${totalRevenue.toLocaleString()}`,
    tableHtml,
  }
}
