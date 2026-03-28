import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DASHBOARD_ROLES   = ['Controller', 'Admin', 'Super Admin']
const SETTINGS_ROLES    = ['Admin', 'Super Admin']
const ADMIN_ROLES       = ['Controller', 'Admin', 'Super Admin']
const SUPER_ADMIN_ROLES = ['Super Admin']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public route — redirect logged-in users to their home
  if (pathname === '/login') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: string }>()
      const role = profile?.role
      if (role === 'Staff') {
        return NextResponse.redirect(new URL('/reimbursements', request.url))
      }
      if (DASHBOARD_ROLES.includes(role ?? '')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/projects', request.url))
    }
    return supabaseResponse
  }

  // Cron routes use CRON_SECRET header auth, not session auth
  if (pathname.startsWith('/api/cron/')) {
    return supabaseResponse
  }

  // Not logged in → /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based protection (lazy-load profile only when needed)
  const needsRoleCheck =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/projects')

  if (needsRoleCheck) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    // If the DB query fails (e.g. RLS blocks the anon key), fall through and
    // let the page component do its own role check with the service-role client.
    if (!profileError) {
      const role = profile?.role ?? 'Staff'

      // Staff can ONLY access /reimbursements — redirect everything else
      if (role === 'Staff' && !pathname.startsWith('/reimbursements')) {
        return NextResponse.redirect(new URL('/reimbursements', request.url))
      }

      if (pathname.startsWith('/admin/users') && !SUPER_ADMIN_ROLES.includes(role)) {
        return NextResponse.redirect(new URL('/projects', request.url))
      }
      if (pathname.startsWith('/admin/settings') && !SUPER_ADMIN_ROLES.includes(role)) {
        return NextResponse.redirect(new URL('/projects', request.url))
      }
      if (pathname.startsWith('/admin') && !ADMIN_ROLES.includes(role)) {
        return NextResponse.redirect(new URL('/projects', request.url))
      }
      if (pathname.startsWith('/reports') && !DASHBOARD_ROLES.includes(role)) {
        return NextResponse.redirect(new URL('/projects', request.url))
      }
      if (pathname.startsWith('/payments') && !ADMIN_ROLES.includes(role)) {
        return NextResponse.redirect(new URL('/projects', request.url))
      }
      if (pathname.startsWith('/dashboard') && !DASHBOARD_ROLES.includes(role)) {
        return NextResponse.redirect(new URL('/projects', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
