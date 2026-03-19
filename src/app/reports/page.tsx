import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import ReportsClient, { type RawRevenue, type RawExpense, type RawProject, type RawBrand } from './reports-client'

const DASHBOARD_ROLES = ['Controller', 'Admin', 'Super Admin']

export default async function ReportsPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!DASHBOARD_ROLES.includes(profile?.role ?? '')) redirect('/projects')

  const [
    { data: rawRevenues },
    { data: rawExpenses },
    { data: rawProjects },
    { data: rawBrands },
  ] = await Promise.all([
    db.from('revenues')
      .select('id, amount, status, issue_date, invoice_number, description, project_id, projects(name, project_code, brands(name))'),
    db.from('expenses')
      .select('id, amount, status, created_at, project_id, projects(brands(name))'),
    db.from('projects')
      .select('id, name, project_code, status, estimated_revenue, brands(name)')
      .order('created_at', { ascending: false }),
    db.from('brands').select('id, name').order('name'),
  ])

  const revenues: RawRevenue[] = (rawRevenues ?? []).map((r: any) => ({
    id: r.id,
    amount: Number(r.amount),
    status: r.status,
    issue_date: r.issue_date,
    invoice_number: r.invoice_number,
    description: r.description,
    project_id: r.project_id,
    project_name: r.projects?.name ?? '—',
    project_code: r.projects?.project_code ?? null,
    brand_name: r.projects?.brands?.name ?? '—',
  }))

  const expenses: RawExpense[] = (rawExpenses ?? []).map((e: any) => ({
    id: e.id,
    amount: Number(e.amount),
    status: e.status,
    created_at: e.created_at,
    project_id: e.project_id,
    brand_name: e.projects?.brands?.name ?? '—',
  }))

  const projects: RawProject[] = (rawProjects ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    project_code: p.project_code,
    brand_name: p.brands?.name ?? '—',
    status: p.status,
    estimated_revenue: p.estimated_revenue,
  }))

  const brands: RawBrand[] = (rawBrands ?? []).map((b: any) => ({ id: b.id, name: b.name }))

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-gray-900">报表中心</h1>
          <p className="text-sm text-gray-400">数据截止：{new Date().toLocaleDateString('zh-CN')}</p>
        </div>
        <ReportsClient
          revenues={revenues}
          expenses={expenses}
          projects={projects}
          brands={brands}
        />
    </main>
  )
}
