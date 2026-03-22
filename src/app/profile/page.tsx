import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getServerT } from '@/i18n/use-server-t'

import ProfileForm from './profile-form'
import BankAccountForm from './bank-account-form'

export default async function ProfilePage() {
  const t = await getServerT()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await db
    .from('profiles')
    .select('full_name, role, created_at, bank_bsb, bank_account, bank_account_name')
    .eq('id', user.id)
    .single<{ full_name: string | null; role: string; created_at: string; bank_bsb: string | null; bank_account: string | null; bank_account_name: string | null }>()

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 space-y-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('profile.desc')}</p>
        </div>
        <ProfileForm
          fullName={profile?.full_name ?? null}
          email={user.email ?? ''}
          role={profile?.role ?? 'Staff'}
          createdAt={profile?.created_at ?? user.created_at}
        />

        {/* Bank Account */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-4">
          <h2 className="font-semibold text-gray-900 mb-1">{t('profile.bankAccount')}</h2>
          <p className="text-sm text-gray-500 mb-5">{t('profile.bankAccountDesc')}</p>
          <BankAccountForm
            bankBsb={profile?.bank_bsb ?? null}
            bankAccount={profile?.bank_account ?? null}
            bankAccountName={profile?.bank_account_name ?? null}
          />
        </div>
    </main>
  )
}
