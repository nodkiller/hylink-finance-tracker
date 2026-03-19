import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

import ProfileForm from './profile-form'

export default async function ProfilePage() {
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
    .select('full_name, role, created_at')
    .eq('id', user.id)
    .single<{ full_name: string | null; role: string; created_at: string }>()

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 space-y-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的账号信息和登录凭据。</p>
        </div>
        <ProfileForm
          fullName={profile?.full_name ?? null}
          email={user.email ?? ''}
          role={profile?.role ?? 'Staff'}
          createdAt={profile?.created_at ?? user.created_at}
        />
    </main>
  )
}
