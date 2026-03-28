import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  const role = profile?.role ?? 'Staff'

  if (role === 'Staff') {
    redirect('/reimbursements')
  } else if (['Controller', 'Admin', 'Super Admin'].includes(role)) {
    redirect('/dashboard')
  } else {
    redirect('/projects')
  }
}
