import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { notify, notifyRoles } from '@/lib/notify'
import { sendPaymentReminder } from '@/lib/email'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Vercel Cron handler — runs daily at 01:00 UTC (09:00 CST)
 * Checks for upcoming payment dates and sends reminders.
 */
export async function GET(request: Request) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const day = today.getUTCDate()
  const month = today.getUTCMonth()
  const year = today.getUTCFullYear()

  // Determine which payment dates to check
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  const day15 = 15
  const day30 = Math.min(30, lastDayOfMonth)

  // Determine reminder tier
  let reminderDueDate: string | null = null
  let tier: '3d' | '1d' | 'today' | null = null

  // Check if today is 3 days before, 1 day before, or on a payment date
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
    return NextResponse.json({ message: 'No reminder needed today', day })
  }

  try {
    // Query expenses due on the reminder date
    const { data: expenses, error: queryError } = await db()
      .from('expenses')
      .select('id, payee, amount, description, invoice_number, project_id, projects(name)')
      .eq('payment_due_date', reminderDueDate)
      .in('status', ['Approved', 'Pending Approval', 'Pending Super Approval'])

    if (queryError) throw queryError

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ message: 'No pending expenses for this date', date: reminderDueDate })
    }

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const referenceId = `payment_reminder_${reminderDueDate}_${tier}`

    // Build notification content based on tier
    let title: string
    if (tier === '3d') {
      title = `${expenses.length} payments (A$${totalAmount.toLocaleString()}) due on ${reminderDueDate}`
    } else if (tier === '1d') {
      title = `Urgent: ${expenses.length} payments due tomorrow (${reminderDueDate})`
    } else {
      title = `Payments due today: ${expenses.length} items, A$${totalAmount.toLocaleString()}`
    }

    // Send in-app notifications
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

    // Send email reminders
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

    return NextResponse.json({
      message: `Sent ${tier} reminder for ${reminderDueDate}`,
      expenseCount: expenses.length,
      totalAmount,
    })
  } catch (error) {
    console.error('[cron] Payment reminder failed:', error)

    // Notify Super Admin about cron failure — zero silent failures
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
      // Last resort — at least log it
      console.error('[cron] Failed to notify about cron failure')
    }

    return NextResponse.json({ error: 'Cron failed', message: (error as Error).message }, { status: 500 })
  }
}
