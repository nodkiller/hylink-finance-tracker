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
    .single<{ role: 'Staff' | 'Controller' }>()

  if (profile?.role === 'Controller') {
    redirect('/dashboard')
  } else {
    redirect('/projects')
  }
}
