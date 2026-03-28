import { notFound, redirect } from 'next/navigation'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getServerT, getServerLocale } from '@/i18n/use-server-t'
import ReimbursementDetail from './reimbursement-detail'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface Props {
  params: Promise<{ id: string }>
}

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
  updated_at: string
}

const APPROVER_ROLES = ['Controller', 'Admin', 'Super Admin']

export default async function ReimbursementDetailPage({ params }: Props) {
  const { id } = await params
  const t = await getServerT()
  const locale = await getServerLocale()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single<{ role: string; full_name: string | null }>()

  const userRole = profile?.role ?? ''
  const isApprover = APPROVER_ROLES.includes(userRole)

  const { data: reimbursement } = await db
    .from('reimbursements')
    .select('*')
    .eq('id', id)
    .single<ReimbursementRow>()

  if (!reimbursement) notFound()

  // Access check: owner or approver
  if (reimbursement.submitted_by !== user.id && !isApprover) {
    redirect('/reimbursements')
  }

  // Get names for submitter, approver, paid_by
  const userIds = [
    reimbursement.submitted_by,
    reimbursement.approved_by,
    reimbursement.paid_by,
  ].filter((x): x is string => x !== null)

  const nameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', [...new Set(userIds)])
      .returns<{ id: string; full_name: string | null }[]>()
    for (const p of profiles ?? []) {
      nameMap[p.id] = p.full_name ?? 'Unknown'
    }
  }

  // Get project name if linked
  let projectName: string | null = null
  if (reimbursement.project_id) {
    const { data: proj } = await db
      .from('projects')
      .select('name, project_code')
      .eq('id', reimbursement.project_id)
      .single<{ name: string; project_code: string | null }>()
    projectName = proj ? (proj.project_code ? `${proj.project_code} - ${proj.name}` : proj.name) : null
  }

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <a href="/reimbursements" className="hover:text-gray-600 transition-colors">
          {t('reimbursement.title')}
        </a>
        <span>/</span>
        <span className="text-gray-700 font-medium">{reimbursement.reimbursement_no}</span>
      </div>

      <ReimbursementDetail
        reimbursement={{
          ...reimbursement,
          submitter_name: nameMap[reimbursement.submitted_by] ?? 'Unknown',
          approver_name: reimbursement.approved_by ? (nameMap[reimbursement.approved_by] ?? null) : null,
          paid_by_name: reimbursement.paid_by ? (nameMap[reimbursement.paid_by] ?? null) : null,
          project_name: projectName,
        }}
        isApprover={isApprover}
        isOwner={reimbursement.submitted_by === user.id}
        locale={locale}
        userRole={userRole}
      />
    </main>
  )
}
