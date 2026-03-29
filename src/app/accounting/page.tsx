import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getServerT, getServerLocale } from '@/i18n/use-server-t'
import AccountingClient from './accounting-client'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const APPROVER_ROLES = ['Controller', 'Admin', 'Super Admin']

interface DocumentRow {
  id: string
  month: string
  doc_type: string
  description: string | null
  amount: number | null
  file_url: string
  file_name: string
  project_id: string | null
  uploaded_by: string
  created_at: string
}

interface LinkRow {
  id: string
  token: string
  label: string
  month_from: string
  month_to: string
  created_by: string
  expires_at: string
  created_at: string
}

export default async function AccountingPage() {
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

  // Query documents: approvers see all, others see own only
  let docQuery = db
    .from('accounting_documents')
    .select('*')
    .order('month', { ascending: false })
    .order('created_at', { ascending: false })

  if (!isApprover) {
    docQuery = docQuery.eq('uploaded_by', user.id)
  }

  const { data: documents } = await docQuery.returns<DocumentRow[]>()

  // Get uploader names
  const uploaderIds = [...new Set((documents ?? []).map(d => d.uploaded_by))]
  const nameMap: Record<string, string> = {}
  if (uploaderIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds)
      .returns<{ id: string; full_name: string | null }[]>()
    for (const p of profiles ?? []) {
      nameMap[p.id] = p.full_name ?? 'Unknown'
    }
  }

  // Get magic links (approvers only)
  let links: LinkRow[] = []
  if (isApprover) {
    const { data: rawLinks } = await db
      .from('accounting_links')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<LinkRow[]>()
    links = rawLinks ?? []
  }

  // Get active projects for optional linking
  const { data: projects } = await db
    .from('projects')
    .select('id, name, project_code')
    .in('status', ['Active', 'Completed'])
    .order('name')
    .returns<{ id: string; name: string; project_code: string | null }[]>()

  // Get project names for display
  const projectIds = [...new Set(
    (documents ?? [])
      .map(d => d.project_id)
      .filter((x): x is string => x !== null)
  )]
  const projectMap: Record<string, string> = {}
  if (projectIds.length > 0) {
    const { data: projData } = await db
      .from('projects')
      .select('id, name, project_code')
      .in('id', projectIds)
      .returns<{ id: string; name: string; project_code: string | null }[]>()
    for (const p of projData ?? []) {
      projectMap[p.id] = p.project_code ?? p.name
    }
  }

  const items = (documents ?? []).map(d => ({
    ...d,
    uploader_name: nameMap[d.uploaded_by] ?? 'Unknown',
    project_name: d.project_id ? (projectMap[d.project_id] ?? null) : null,
  }))

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {t('accounting.title')}
        </h1>
      </div>

      <AccountingClient
        documents={items}
        links={links}
        isApprover={isApprover}
        locale={locale}
        projects={projects ?? []}
        currentUserId={user.id}
      />
    </main>
  )
}
