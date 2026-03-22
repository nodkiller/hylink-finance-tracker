import { createClient as createAdmin } from '@supabase/supabase-js'

function db() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Date helpers ──────────────────────────────────────────────

/**
 * Compute the next payment cycle date (15th or 30th).
 * February edge case: uses min(30, lastDayOfMonth).
 */
export function getNextPaymentDueDate(fromDate: Date = new Date()): string {
  const year = fromDate.getFullYear()
  const month = fromDate.getMonth()
  const day = fromDate.getDate()

  if (day <= 15) {
    return formatDate(new Date(year, month, 15))
  }

  const lastDay = new Date(year, month + 1, 0).getDate()
  const dueDay = Math.min(30, lastDay)
  const dueDate = new Date(year, month, dueDay)

  if (dueDate < fromDate) {
    return formatDate(new Date(year, month + 1, 15))
  }

  return formatDate(dueDate)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Payment calendar query ────────────────────────────────────

export interface PaymentGroup {
  payment_due_date: string
  total_amount: number
  approved_amount: number
  paid_amount: number
  expense_count: number
  approved_count: number
  paid_count: number
  pending_count: number
  expenses: PaymentExpense[]
}

export interface PaymentExpense {
  id: string
  payee: string
  description: string
  invoice_number: string
  amount: number
  status: string
  payment_date: string | null
  payment_due_date: string | null
  created_at: string
  project_id: string
  project_name?: string
  brand_name?: string
  approver_name?: string
  last_email_sent_at?: string | null
  email_sent_count?: number
}

export interface PaymentCalendarFilters {
  brandId?: string
  status?: 'all' | 'pending' | 'paid'
  month?: string // YYYY-MM
}

export async function getPaymentCalendar(filters: PaymentCalendarFilters = {}) {
  let query = db()
    .from('expenses')
    .select(`
      id, payee, description, invoice_number, amount, status,
      payment_date, payment_due_date, created_at, project_id,
      last_email_sent_at, email_sent_count, approver_id,
      projects(name, brand_id, brands(name))
    `)
    .not('payment_due_date', 'is', null)
    .order('payment_due_date', { ascending: true })

  if (filters.brandId) {
    query = query.eq('projects.brand_id', filters.brandId)
  }

  if (filters.status === 'pending') {
    query = query.in('status', ['Approved', 'Pending Approval', 'Pending Super Approval'])
  } else if (filters.status === 'paid') {
    query = query.eq('status', 'Paid')
  }

  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)
    query = query.gte('payment_due_date', startDate).lte('payment_due_date', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  // Group by payment_due_date
  const groups = new Map<string, PaymentGroup>()

  for (const row of (data || [])) {
    const dueDate = row.payment_due_date as string
    if (!groups.has(dueDate)) {
      groups.set(dueDate, {
        payment_due_date: dueDate,
        total_amount: 0,
        approved_amount: 0,
        paid_amount: 0,
        expense_count: 0,
        approved_count: 0,
        paid_count: 0,
        pending_count: 0,
        expenses: [],
      })
    }

    const group = groups.get(dueDate)!
    const amount = Number(row.amount)
    group.total_amount += amount
    group.expense_count++

    if (row.status === 'Approved') {
      group.approved_amount += amount
      group.approved_count++
    } else if (row.status === 'Paid') {
      group.paid_amount += amount
      group.paid_count++
    } else {
      group.pending_count++
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = row.projects as any

    group.expenses.push({
      id: row.id,
      payee: row.payee,
      description: row.description,
      invoice_number: row.invoice_number,
      amount,
      status: row.status,
      payment_date: row.payment_date,
      payment_due_date: row.payment_due_date,
      created_at: row.created_at,
      project_id: row.project_id,
      project_name: project?.name,
      brand_name: project?.brands?.name,
      last_email_sent_at: row.last_email_sent_at,
      email_sent_count: row.email_sent_count ?? 0,
    })
  }

  return Array.from(groups.values())
}

// ── Dashboard helpers ─────────────────────────────────────────

export async function getUpcomingPaymentStats() {
  const today = new Date().toISOString().slice(0, 10)
  const nextDueDate = getNextPaymentDueDate(new Date())

  // Upcoming payments (next cycle)
  const { data: upcoming } = await db()
    .from('expenses')
    .select('amount')
    .eq('payment_due_date', nextDueDate)
    .in('status', ['Approved', 'Pending Approval', 'Pending Super Approval'])

  // Overdue payments (past due, not paid)
  const { data: overdue } = await db()
    .from('expenses')
    .select('amount')
    .lt('payment_due_date', today)
    .in('status', ['Approved', 'Pending Approval', 'Pending Super Approval'])

  const upcomingTotal = (upcoming || []).reduce((sum, e) => sum + Number(e.amount), 0)
  const upcomingCount = (upcoming || []).length
  const overdueTotal = (overdue || []).reduce((sum, e) => sum + Number(e.amount), 0)
  const overdueCount = (overdue || []).length

  return {
    upcoming: { total: upcomingTotal, count: upcomingCount, dueDate: nextDueDate },
    overdue: { total: overdueTotal, count: overdueCount },
  }
}
