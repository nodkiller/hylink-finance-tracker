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
      if (DASHBOARD_ROLES.includes(role ?? '')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/projects', request.url))
    }
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
    pathname.startsWith('/admin')

  if (needsRoleCheck) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()
    const role = profile?.role ?? 'Staff'

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
    if (pathname.startsWith('/dashboard') && !DASHBOARD_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/projects', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
