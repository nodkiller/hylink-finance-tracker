import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import BrandsClient, { type BrandStat } from './brands-client'

export default async function AdminBrandsPage() {
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
  if (!['Controller', 'Admin', 'Super Admin'].includes(profile?.role ?? '')) {
    redirect('/projects')
  }

  const [
    { data: brands },
    { data: projects },
    { data: revenues },
    { data: expenses },
  ] = await Promise.all([
    db.from('brands').select('id, name, is_active, created_at').order('name'),
    db.from('projects').select('id, brand_id'),
    db.from('revenues').select('amount, status, projects(brand_id)').eq('status', 'Paid'),
    db.from('expenses').select('amount, status, projects(brand_id)').in('status', ['Approved', 'Paid']),
  ])

  // Build per-brand stats
  const projectCountMap: Record<string, number> = {}
  for (const p of projects ?? []) {
    const bid = (p as any).brand_id
    if (bid) projectCountMap[bid] = (projectCountMap[bid] ?? 0) + 1
  }

  const revenueMap: Record<string, number> = {}
  for (const r of revenues ?? []) {
    const bid = (r as any).projects?.brand_id
    if (bid) revenueMap[bid] = (revenueMap[bid] ?? 0) + Number((r as any).amount)
  }

  const expenseMap: Record<string, number> = {}
  for (const e of expenses ?? []) {
    const bid = (e as any).projects?.brand_id
    if (bid) expenseMap[bid] = (expenseMap[bid] ?? 0) + Number((e as any).amount)
  }

  const brandStats: BrandStat[] = (brands ?? []).map((b: any) => {
    const rev = revenueMap[b.id] ?? 0
    const exp = expenseMap[b.id] ?? 0
    return {
      id: b.id,
      name: b.name,
      is_active: b.is_active ?? true,
      created_at: b.created_at,
      project_count: projectCountMap[b.id] ?? 0,
      revenue: rev,
      expenses: exp,
      profit: rev - exp,
    }
  })

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <BrandsClient brands={brandStats} />
    </main>
  )
}
