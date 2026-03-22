import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getServerT, getServerLocale } from '@/i18n/use-server-t'
import ReimbursementsList from './reimbursements-list'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const APPROVER_ROLES = ['Controller', 'Admin', 'Super Admin']

interface ReimbursementRow {
  id: string
  reimbursement_no: string
  title: string
  category: string
  project_id: string | null
  amount: number
  expense_date: string
  description: string | null
  receipt_urls: string[]
  bank_bsb: string
  bank_account: string
  bank_account_name: string
  status: string
  submitted_by: string
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  approval_comment: string | null
  paid_at: string | null
  paid_by: string | null
  created_at: string
}

export default async function ReimbursementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single<{ role: string; full_name: string | null }>()

  if (!profile) redirect('/login')

  const t = await getServerT()
  const locale = await getServerLocale()
  const isApprover = APPROVER_ROLES.includes(profile.role)

  // Query reimbursements: approvers see all, staff see own only
  let query = db
    .from('reimbursements')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isApprover) {
    query = query.eq('submitted_by', user.id)
  }

  const { data: reimbursements } = await query.returns<ReimbursementRow[]>()

  // Get submitter names
  const submitterIds = [...new Set((reimbursements ?? []).map(r => r.submitted_by))]
  const approverIds = [...new Set(
    (reimbursements ?? [])
      .map(r => r.approved_by)
      .filter((x): x is string => x !== null)
  )]
  const paidByIds = [...new Set(
    (reimbursements ?? [])
      .map(r => r.paid_by)
      .filter((x): x is string => x !== null)
  )]
  const allUserIds = [...new Set([...submitterIds, ...approverIds, ...paidByIds])]

  const nameMap: Record<string, string> = {}
  if (allUserIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds)
      .returns<{ id: string; full_name: string | null }[]>()
    for (const p of profiles ?? []) {
      nameMap[p.id] = p.full_name ?? 'Unknown'
    }
  }

  // Get project names for related projects
  const projectIds = [...new Set(
    (reimbursements ?? [])
      .map(r => r.project_id)
      .filter((x): x is string => x !== null)
  )]
  const projectMap: Record<string, string> = {}
  if (projectIds.length > 0) {
    const { data: projects } = await db
      .from('projects')
      .select('id, name, project_code')
      .in('id', projectIds)
      .returns<{ id: string; name: string; project_code: string | null }[]>()
    for (const p of projects ?? []) {
      projectMap[p.id] = p.project_code ?? p.name
    }
  }

  // Get user's bank details for auto-fill
  const { data: userProfile } = await db
    .from('profiles')
    .select('bank_bsb, bank_account, bank_account_name')
    .eq('id', user.id)
    .single<{ bank_bsb: string | null; bank_account: string | null; bank_account_name: string | null }>()

  // Get active projects for the new reimbursement dropdown
  const { data: projects } = await db
    .from('projects')
    .select('id, name, project_code')
    .in('status', ['Active', 'Completed'])
    .order('name')
    .returns<{ id: string; name: string; project_code: string | null }[]>()

  const items = (reimbursements ?? []).map(r => ({
    ...r,
    submitter_name: nameMap[r.submitted_by] ?? 'Unknown',
    approver_name: r.approved_by ? (nameMap[r.approved_by] ?? null) : null,
    paid_by_name: r.paid_by ? (nameMap[r.paid_by] ?? null) : null,
    project_name: r.project_id ? (projectMap[r.project_id] ?? null) : null,
  }))

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {t('reimbursement.title')}
        </h1>
      </div>

      <ReimbursementsList
        reimbursements={items}
        isApprover={isApprover}
        locale={locale}
        projects={projects ?? []}
        userBankDetails={{
          bsb: userProfile?.bank_bsb ?? '',
          account: userProfile?.bank_account ?? '',
          accountName: userProfile?.bank_account_name ?? '',
        }}
      />
    </main>
  )
}
