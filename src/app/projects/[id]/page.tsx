import { notFound } from 'next/navigation'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/app-header'
import RevenueSection from './revenue-section'
import ExpenseSection from './expense-section'
import ReconcilePanel from './reconcile-panel'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_COLORS: Record<string, string> = {
  'Active':           'bg-[#3A7D44]/10 text-[#3A7D44] border-[#3A7D44]/25',
  'Pending Approval': 'bg-[#D48E00]/10 text-[#D48E00] border-[#D48E00]/25',
  'Completed':        'bg-[#2A4A6B]/10 text-[#2A4A6B] border-[#2A4A6B]/25',
  'Reconciled':       'bg-gray-100 text-gray-500 border-gray-200',
  'Rejected':         'bg-[#C0392B]/10 text-[#C0392B] border-[#C0392B]/25',
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

  // Get current user role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
    : { data: null }
  const isController = profile?.role === 'Controller'

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: project }, { data: revenues }, { data: expensesRaw }] = await Promise.all([
    db
      .from('projects')
      .select('*, brands(name), profiles(full_name)')
      .eq('id', id)
      .single(),
    db
      .from('revenues')
      .select('*')
      .eq('project_id', id)
      .order('issue_date', { ascending: false }),
    db
      .from('expenses')
      .select('*, profiles(full_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  const p = project as any
  const brandName: string  = p.brands?.name ?? '—'
  const creatorName: string = p.profiles?.full_name ?? '—'
  const isActive = p.status === 'Active'

  // Compute totals for reconcile panel
  const allRevenues = revenues ?? []
  const allExpenses = expensesRaw ?? []
  const totalRevenue = allRevenues.reduce((s: number, r: any) => s + Number(r.amount), 0)
  const totalExpenses = allExpenses
    .filter((e: any) => e.status === 'Approved' || e.status === 'Paid')
    .reduce((s: number, e: any) => s + Number(e.amount), 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9F9F9' }}>
      <AppHeader title={p.name} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <a href="/projects" className="hover:text-gray-600 transition-colors">项目列表</a>
          <span>/</span>
          <span className="text-gray-700">{p.name}</span>
        </div>

        {/* Project Info Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 relative">
          {isActive && (
            <div className="absolute top-4 right-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                Active
              </span>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">项目代码</p>
            {p.project_code ? (
              <p className="text-2xl font-bold font-mono text-gray-900 tracking-wide">
                {p.project_code}
              </p>
            ) : (
              <p className="text-lg font-mono text-gray-300 italic">待审批分配</p>
            )}
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
          revenues={(revenues ?? []).map((r: any) => ({
            id: r.id,
            description: r.description,
            invoice_number: r.invoice_number,
            amount: r.amount,
            status: r.status,
            issue_date: r.issue_date,
            received_date: r.received_date,
          }))}
        />

        {/* Reconcile Panel — Controllers only */}
        {isController && (
          <ReconcilePanel
            projectId={id}
            projectStatus={p.status}
            estimatedRevenue={p.estimated_revenue}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpenses}
          />
        )}

        {/* Expense Section */}
        <ExpenseSection
          projectId={id}
          isController={isController}
          expenses={(expensesRaw ?? []).map((e: any) => ({
            id: e.id,
            payee: e.payee,
            description: e.description,
            invoice_number: e.invoice_number,
            amount: e.amount,
            status: e.status,
            attachment_url: e.attachment_url,
            approver_name: e.profiles?.full_name ?? null,
            rejection_reason: e.rejection_reason ?? null,
            payment_date: e.payment_date,
          }))}
        />
      </main>
    </div>
  )
}

