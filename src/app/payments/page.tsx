import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getPaymentCalendar } from '@/lib/payments'
import { getServerT, getServerLocale } from '@/i18n/use-server-t'
import PaymentCalendar from './payment-calendar'

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ALLOWED_ROLES = ['Controller', 'Admin', 'Super Admin']

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; status?: string; month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient()
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single<{ role: string }>()
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) redirect('/projects')

  const t = await getServerT()
  const locale = await getServerLocale()
  const params = await searchParams

  const filters = {
    brandId: params.brand || undefined,
    status: (params.status as 'all' | 'pending' | 'paid') || undefined,
    month: params.month || undefined,
  }

  let groups: Awaited<ReturnType<typeof getPaymentCalendar>> = []
  let error: string | null = null
  try {
    groups = await getPaymentCalendar(filters)
  } catch (e) {
    error = (e as Error).message
    console.error('[payments] getPaymentCalendar error:', e)
    groups = []
  }

  // Get brands for filter
  const { data: brands } = await db.from('brands').select('id, name').eq('is_active', true).order('name')

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {t('payments.title')}
        </h1>
      </div>

      <PaymentCalendar
        groups={groups}
        brands={(brands || []).map(b => ({ id: b.id, name: b.name }))}
        locale={locale}
        error={error}
        currentFilters={filters}
      />
    </main>
  )
}
