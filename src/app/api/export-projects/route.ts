import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET() {
  // Verify Controller role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profile?.role !== 'Controller') return new NextResponse('Forbidden', { status: 403 })

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: projects }, { data: revenues }, { data: expenses }] = await Promise.all([
    db.from('projects')
      .select('id, project_code, name, type, status, estimated_revenue, brands(name)')
      .order('created_at', { ascending: false }),
    db.from('revenues').select('project_id, amount').eq('status', 'Paid'),
    db.from('expenses').select('project_id, amount').in('status', ['Approved', 'Paid']),
  ])

  const revenueMap = new Map<string, number>()
  for (const r of revenues ?? []) {
    revenueMap.set(r.project_id, (revenueMap.get(r.project_id) ?? 0) + Number(r.amount))
  }
  const expenseMap = new Map<string, number>()
  for (const e of expenses ?? []) {
    expenseMap.set(e.project_id, (expenseMap.get(e.project_id) ?? 0) + Number(e.amount))
  }

  const headers = ['Project Code', 'Brand', 'Project Name', 'Type', 'Est. Revenue', 'Actual Revenue', 'Actual Expenses', 'Profit', 'Status']
  const rows = (projects ?? []).map((p: any) => {
    const rev = revenueMap.get(p.id) ?? 0
    const exp = expenseMap.get(p.id) ?? 0
    const profit = rev - exp
    return [
      p.project_code ?? '',
      (p.brands as any)?.name ?? '',
      p.name,
      p.type,
      p.estimated_revenue ?? '',
      rev,
      exp,
      profit,
      p.status,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })

  const csv = '\ufeff' + [headers.join(','), ...rows].join('\r\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hylink-report-${date}.csv"`,
    },
  })
}
