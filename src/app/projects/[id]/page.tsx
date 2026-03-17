import { notFound } from 'next/navigation'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/app-header'
import RevenueSection from './revenue-section'
import ExpenseSection from './expense-section'
import ReconcilePanel from './reconcile-panel'
import EditProjectDialog from './edit-project-dialog'
import DeleteProjectButton from './delete-project-button'
import ProjectApprovalButtons from './project-approval-buttons'
import ApprovalHistory, { type ApprovalRecord } from './approval-history'
import ProjectTimeline, { type TimelineEvent } from './project-timeline'

interface Props {
  params: Promise<{ id: string }>
}

interface ProjectRow {
  id: string
  brand_id: string
  created_by: string | null
  name: string
  type: string
  status: string
  estimated_revenue: number | null
  project_code: string | null
  notes: string | null
  rejection_reason: string | null
  created_at: string
  brands: { id: string; name: string } | null
}

interface RevenueRow {
  id: string
  description: string | null
  invoice_number: string | null
  amount: number
  status: string
  issue_date: string
  received_date: string | null
  created_at: string
}

interface ExpenseRow {
  id: string
  payee: string
  description: string
  invoice_number: string
  amount: number
  status: string
  attachment_url: string
  approver_id: string | null
  rejection_reason: string | null
  payment_date: string | null
  created_at: string
}

interface ApprovalRow {
  id: string
  action: 'approved' | 'rejected'
  comment: string | null
  approved_by: string | null
  created_at: string
}

interface ApproverRow {
  id: string
  full_name: string | null
}

const STATUS_COLORS: Record<string, string> = {
  'Active':           'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/25',
  'Pending Approval': 'bg-[#DD6B20]/10 text-[#DD6B20] border-[#DD6B20]/25',
  'Completed':        'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25',
  'Reconciled':       'bg-gray-100 text-gray-500 border-gray-200',
  'Rejected':         'bg-[#E53E3E]/10 text-[#E53E3E] border-[#E53E3E]/25',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  )
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return `A$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = user
    ? await db.from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
    : { data: null }
  const userRole = profile?.role ?? ''
  const canSubmit = ['Controller', 'Admin', 'Super Admin'].includes(userRole)
  const canConfirmPayment = canSubmit
  const canEdit = canSubmit
  const canApprove = ['Controller', 'Super Admin'].includes(userRole)

  const [
    { data: project },
    { data: revenues },
    { data: expensesRaw },
    { data: brands },
    { data: approvalsRaw },
  ] = await Promise.all([
    db.from('projects').select('*, brands(name, id)').eq('id', id).single<ProjectRow>(),
    db.from('revenues').select('*').eq('project_id', id).order('issue_date', { ascending: false }).returns<RevenueRow[]>(),
    db.from('expenses').select('*').eq('project_id', id).order('created_at', { ascending: false }).returns<ExpenseRow[]>(),
    db.from('brands').select('id, name').order('name'),
    db.from('project_approvals').select('*').eq('project_id', id).order('created_at', { ascending: false }).returns<ApprovalRow[]>(),
  ])

  if (!project) notFound()

  const p: ProjectRow = project

  const { data: creatorProfile } = p.created_by
    ? await db.from('profiles').select('full_name').eq('id', p.created_by).single<{ full_name: string }>()
    : { data: null }

  const approverIds = [...new Set((expensesRaw ?? []).map(e => e.approver_id).filter((x): x is string => x !== null))]
  const approvalApproverIds = [...new Set((approvalsRaw ?? []).map(a => a.approved_by).filter((x): x is string => x !== null))]
  const allApproverIds = [...new Set([...approverIds, ...approvalApproverIds])]
  const approverMap = new Map<string, string>()
  if (allApproverIds.length > 0) {
    const { data: approvers } = await db.from('profiles').select('id, full_name').in('id', allApproverIds).returns<ApproverRow[]>()
    for (const a of approvers ?? []) approverMap.set(a.id, a.full_name ?? '—')
  }

  const approvals: ApprovalRecord[] = (approvalsRaw ?? []).map(a => ({
    id: a.id,
    action: a.action,
    comment: a.comment,
    approver_name: approverMap.get(a.approved_by ?? '') ?? '—',
    created_at: a.created_at,
  }))

  const brandName: string   = p.brands?.name ?? '—'
  const creatorName: string = creatorProfile?.full_name ?? '—'
  const isActive = p.status === 'Active'
  const hasRecords = (revenues?.length ?? 0) > 0 || (expensesRaw?.length ?? 0) > 0

  const allRevenues: RevenueRow[] = revenues ?? []
  const allExpenses: ExpenseRow[] = expensesRaw ?? []
  const totalRevenue = allRevenues.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = allExpenses
    .filter(e => e.status === 'Approved' || e.status === 'Paid')
    .reduce((s, e) => s + Number(e.amount), 0)

  const canReconcile = ['Controller', 'Super Admin'].includes(userRole)
  const unpaidRevenueCount = allRevenues.filter(r => r.status !== 'Paid').length
  const pendingExpenseCount = allExpenses.filter(e => !['Paid', 'Rejected'].includes(e.status)).length

  const profit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : null

  // Build timeline events
  const timelineEvents: TimelineEvent[] = [
    // Project created
    {
      id: 'created',
      date: p.created_at,
      type: 'created',
      title: '项目创建',
      subtitle: `由 ${creatorName} 提交申请`,
      color: 'blue',
    },
    // Project approvals
    ...(approvalsRaw ?? []).map(a => ({
      id: `approval-${a.id}`,
      date: a.created_at,
      type: a.action,
      title: a.action === 'approved' ? '项目已审批通过' : '项目已驳回',
      subtitle: a.comment ?? `审批人：${approverMap.get(a.approved_by ?? '') ?? '—'}`,
      color: (a.action === 'approved' ? 'green' : 'red') as TimelineEvent['color'],
    })),
    // Revenues added
    ...(allRevenues).map(r => ({
      id: `revenue-${r.id}`,
      date: r.created_at,
      type: 'revenue',
      title: `收入录入：${r.description ?? '未命名'}`,
      subtitle: `A$${Number(r.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
      color: 'green' as const,
    })),
    // Expenses submitted
    ...(allExpenses).map(e => ({
      id: `expense-${e.id}`,
      date: e.created_at,
      type: 'expense_submitted',
      title: `付款申请：${e.payee}`,
      subtitle: `A$${Number(e.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
      color: 'amber' as const,
    })),
    // Expenses paid
    ...(allExpenses)
      .filter(e => e.status === 'Paid' && e.payment_date)
      .map(e => ({
        id: `paid-${e.id}`,
        date: e.payment_date!,
        type: 'expense_paid',
        title: `付款完成：${e.payee}`,
        subtitle: `A$${Number(e.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
        color: 'green' as const,
      })),
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7FAFC' }}>
      <AppHeader title={p.name} />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-4 md:space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <a href="/projects" className="hover:text-gray-600 transition-colors">项目列表</a>
          <span>/</span>
          <a href={`/projects?brand=${p.brand_id}`} className="hover:text-gray-600 transition-colors">{brandName}</a>
          <span>/</span>
          <span className="text-gray-700 font-medium truncate max-w-[320px]">{p.name}</span>
        </div>

        {/* Project Info Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          {/* Header row: project code + action buttons */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">项目代码</p>
              {p.project_code ? (
                <p className="text-2xl font-bold font-mono text-gray-900 tracking-wide">
                  {p.project_code}
                </p>
              ) : (
                <p className="text-lg font-mono text-gray-300 italic">待审批分配</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                  Active
                </span>
              )}
              {canApprove && p.status === 'Pending Approval' && (
                <ProjectApprovalButtons projectId={p.id} brandName={brandName} />
              )}
              {canEdit && (
                <>
                  <EditProjectDialog
                    project={{
                      id: p.id,
                      name: p.name,
                      type: p.type,
                      brand_id: p.brand_id,
                      brand_name: brandName,
                      estimated_revenue: p.estimated_revenue,
                      project_code: p.project_code,
                      notes: p.notes,
                    }}
                    brands={brands ?? []}
                  />
                  <DeleteProjectButton
                    projectId={p.id}
                    projectName={p.name}
                    hasRecords={hasRecords}
                  />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-gray-50">
            <InfoRow label="品牌" value={brandName} />
            <InfoRow label="项目名称" value={p.name} />
            <InfoRow label="项目类型" value={p.type} />
            <InfoRow
              label="状态"
              value={
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[p.status] ?? ''}`}>
                  {p.status}
                </span>
              }
            />
            <InfoRow label="预估收入" value={fmt(p.estimated_revenue)} />
            <InfoRow label="申请人" value={creatorName} />
            <InfoRow
              label="实际利润"
              value={
                <span className={profit >= 0 ? 'text-[#38A169]' : 'text-[#E53E3E]'}>
                  {fmt(profit)}
                </span>
              }
            />
            <InfoRow
              label="利润率"
              value={
                profitMargin !== null
                  ? <span className={profitMargin >= 0 ? 'text-[#38A169]' : 'text-[#E53E3E]'}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  : <span className="text-gray-400">—</span>
              }
            />
            {p.notes && <InfoRow label="备注" value={<span className="font-normal text-gray-600">{p.notes}</span>} />}
            {p.rejection_reason && (
              <div className="col-span-2">
                <p className="text-xs text-red-400 mb-0.5">拒绝原因</p>
                <p className="text-sm text-red-600">{p.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Section */}
        <RevenueSection
          projectId={id}
          canEdit={canEdit}
          isSuperAdmin={userRole === 'Super Admin'}
          revenues={allRevenues.map(r => ({
            id: r.id,
            description: r.description,
            invoice_number: r.invoice_number,
            amount: r.amount,
            status: r.status,
            issue_date: r.issue_date,
            received_date: r.received_date,
          }))}
        />

        {/* Reconcile Panel — Controller/Admin/Super Admin */}
        {canEdit && (
          <ReconcilePanel
            projectId={id}
            projectStatus={p.status}
            estimatedRevenue={p.estimated_revenue}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpenses}
            canReconcile={canReconcile}
            unpaidRevenueCount={unpaidRevenueCount}
            pendingExpenseCount={pendingExpenseCount}
          />
        )}

        {/* Approval History */}
        <ApprovalHistory approvals={approvals} />

        {/* Expense Section */}
        <ExpenseSection
          projectId={id}
          canSubmit={canSubmit}
          canConfirmPayment={canConfirmPayment}
          canApprove={canApprove}
          expenses={allExpenses.map(e => ({
            id: e.id,
            payee: e.payee,
            description: e.description,
            invoice_number: e.invoice_number,
            amount: e.amount,
            status: e.status,
            attachment_url: e.attachment_url,
            approver_name: e.approver_id ? approverMap.get(e.approver_id) ?? null : null,
            rejection_reason: e.rejection_reason ?? null,
            payment_date: e.payment_date,
          }))}
        />

        {/* Project Timeline */}
        <ProjectTimeline events={timelineEvents} />
      </main>
    </div>
  )
}
