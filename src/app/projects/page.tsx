import { createClient as createAdmin } from '@supabase/supabase-js'
import AppHeader from '@/components/app-header'
import ProjectsTable, { type ProjectRow } from './projects-table'

export default async function ProjectsPage() {
  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch all projects with brand name
  const { data: projects } = await db
    .from('projects')
    .select('id, project_code, name, type, status, estimated_revenue, brand_id, created_at, brands(name)')
    .order('created_at', { ascending: false })

  // Fetch revenue totals per project
  const { data: revenues } = await db
    .from('revenues')
    .select('project_id, amount')

  // Fetch expense totals per project
  const { data: expenses } = await db
    .from('expenses')
    .select('project_id, amount')

  // Build totals maps
  const revenueMap = new Map<string, number>()
  for (const r of revenues ?? []) {
    revenueMap.set(r.project_id, (revenueMap.get(r.project_id) ?? 0) + Number(r.amount))
  }
  const expenseMap = new Map<string, number>()
  for (const e of expenses ?? []) {
    expenseMap.set(e.project_id, (expenseMap.get(e.project_id) ?? 0) + Number(e.amount))
  }

  const rows: ProjectRow[] = (projects ?? []).map((p: any) => ({
    id: p.id,
    project_code: p.project_code,
    brand_name: p.brands?.name ?? '—',
    name: p.name,
    type: p.type,
    status: p.status,
    estimated_revenue: p.estimated_revenue,
    total_revenue: revenueMap.get(p.id) ?? 0,
    total_expenses: expenseMap.get(p.id) ?? 0,
    created_at: p.created_at,
  }))

  const brands = Array.from(new Set(rows.map(r => r.brand_name))).sort()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7FAFC' }}>
      <AppHeader title="项目" />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4 md:space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-gray-900">项目列表</h1>
        </div>
        <ProjectsTable projects={rows} brands={brands} />
      </main>
    </div>
  )
}
