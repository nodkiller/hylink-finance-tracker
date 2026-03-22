import { NextResponse } from 'next/server'
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

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = db()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const brandId = searchParams.get('brand')

  let query = admin
    .from('expenses')
    .select(`
      payee, description, invoice_number, amount, status,
      payment_date, payment_due_date, created_at,
      projects(name, brands(name)),
      profiles:approver_id(full_name)
    `)
    .not('payment_due_date', 'is', null)
    .order('payment_due_date', { ascending: true })

  if (month) {
    const [y, m] = month.split('-').map(Number)
    const startDate = new Date(y, m - 1, 1).toISOString().slice(0, 10)
    const endDate = new Date(y, m, 0).toISOString().slice(0, 10)
    query = query.gte('payment_due_date', startDate).lte('payment_due_date', endDate)
  }

  if (brandId) {
    query = query.eq('projects.brand_id', brandId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build CSV
  const headers = ['Date Paid', 'Due Date', 'Payee', 'Amount (AUD)', 'Status', 'Project', 'Brand', 'Invoice #', 'Description']
  const rows = (data || []).map((e: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = e.projects as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approver = e.profiles as any
    return [
      e.payment_date || '',
      e.payment_due_date || '',
      e.payee,
      e.amount,
      e.status,
      project?.name || '',
      project?.brands?.name || '',
      e.invoice_number,
      e.description,
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
     .join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const bom = '\uFEFF'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payment-history-${month || 'all'}.csv"`,
    },
  })
}
