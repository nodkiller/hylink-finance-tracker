import { createClient as createAdmin } from '@supabase/supabase-js'
import AppHeader from '@/components/app-header'
import BrandsClient from './brands-client'

export default async function AdminBrandsPage() {
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: brands } = await adminClient
    .from('brands')
    .select('id, name, created_at')
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="品牌管理" />
      <main className="p-6 max-w-4xl mx-auto">
        <BrandsClient brands={brands ?? []} />
      </main>
    </div>
  )
}
