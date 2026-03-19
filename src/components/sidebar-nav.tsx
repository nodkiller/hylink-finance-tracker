'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { logout } from '@/app/actions/auth'
import NewProjectDialog from '@/components/new-project-dialog'
import NotificationBell from '@/components/notification-bell'
import type { NotificationItem } from '@/app/actions/notifications'
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  Mail,
  Receipt,
  BarChart2,
  Users,
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'

interface SidebarNavProps {
  userName?: string
  userRole?: string
  hasDashboard: boolean
  hasReports: boolean
  hasAdminMenu: boolean
  hasUserAdmin: boolean
  hasSettings: boolean
  canCreateProject: boolean
  brands: { id: string; name: string }[]
  unread: number
  notifList: NotificationItem[]
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: number | null
  adminOnly?: boolean
  comingSoon?: boolean
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-purple-500/20 text-purple-200',
  'Admin':       'bg-blue-500/20 text-blue-200',
  'Controller':  'bg-sky-500/20 text-sky-200',
  'PM':          'bg-emerald-500/20 text-emerald-200',
  'Viewer':      'bg-slate-500/20 text-slate-300',
  'Staff':       'bg-slate-500/20 text-slate-300',
}

export default function SidebarNav({
  userName,
  userRole,
  hasDashboard,
  hasReports,
  hasAdminMenu,
  hasUserAdmin,
  hasSettings,
  canCreateProject,
  brands,
  unread,
  notifList,
}: SidebarNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const mainNav: NavItem[] = [
    ...(hasDashboard ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { href: '/projects', label: '项目管理', icon: FolderOpen },
    { href: '/expenses', label: '支出管理', icon: CreditCard, comingSoon: true },
    { href: '/payments', label: '付款管理', icon: Mail, comingSoon: true },
    { href: '/reimbursements', label: '报销管理', icon: Receipt, comingSoon: true },
    ...(hasReports ? [{ href: '/reports', label: '报表中心', icon: BarChart2 }] : []),
  ]

  const adminNav: NavItem[] = [
    ...(hasUserAdmin ? [{ href: '/admin/users', label: '用户管理', icon: Users }] : []),
    ...(hasAdminMenu ? [{ href: '/admin/brands', label: '品牌管理', icon: Tag }] : []),
    ...(hasSettings ? [{ href: '/admin/settings', label: '审批设置', icon: Settings }] : []),
  ]

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="transition-transform duration-300 group-hover:scale-105 shrink-0">
            <rect x="0" y="12" width="6" height="8" rx="2" fill="white" opacity="0.35" />
            <rect x="9" y="6" width="6" height="14" rx="2" fill="white" opacity="0.6" />
            <rect x="18" y="0" width="6" height="20" rx="2" fill="white" opacity="0.9" />
            <path d="M3 12 L12 6 L21 0" stroke="white" strokeWidth="1.25" strokeLinecap="round"
              strokeLinejoin="round" opacity="0.4" strokeDasharray="2 2" />
            <circle cx="3" cy="12" r="1.5" fill="white" opacity="0.55" />
            <circle cx="12" cy="6" r="1.5" fill="white" opacity="0.7" />
            <circle cx="21" cy="0" r="1.5" fill="white" opacity="0.9" />
          </svg>
          <div className="flex flex-col leading-none gap-[3px]">
            <span className="text-[13.5px] font-bold tracking-[0.1em] uppercase text-white/90"
              style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
              Hylink
            </span>
            <span className="text-[8.5px] font-semibold tracking-[0.25em] uppercase text-white/35">
              Finance
            </span>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-3 flex items-center gap-2 border-b border-white/[0.06]">
        {canCreateProject && (
          <div className="flex-1">
            <NewProjectDialog brands={brands} />
          </div>
        )}
        <div className="shrink-0">
          <NotificationBell initialUnread={unread} initialNotifications={notifList} dark />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {mainNav.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          if (item.comingSoon) {
            return (
              <div key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/25 cursor-not-allowed select-none">
                <Icon size={16} className="shrink-0" />
                <span>{item.label}</span>
                <span className="ml-auto text-[9px] font-medium tracking-wider uppercase text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </div>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/55 hover:text-white/85 hover:bg-white/[0.06]'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {item.badge}
                </span>
              ) : active ? (
                <ChevronRight size={12} className="text-white/40 shrink-0" />
              ) : null}
            </Link>
          )
        })}

        {/* Admin Section */}
        {adminNav.length > 0 && (
          <>
            <div className="pt-4 pb-1.5 px-3">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-white/25">
                管理
              </span>
            </div>
            {adminNav.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/55 hover:text-white/85 hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight size={12} className="text-white/40 shrink-0" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.06] transition-colors group w-full mb-1"
        >
          <div className="w-7 h-7 rounded-full bg-white/10 text-white/80 text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white/80 truncate leading-tight">
              {userName ?? 'User'}
            </div>
            {userRole && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[userRole] ?? ROLE_COLORS['Staff']}`}>
                {userRole}
              </span>
            )}
          </div>
        </Link>
        <form action={logout} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={15} className="shrink-0" />
            退出登录
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile hamburger button ───────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-[#1e293b] text-white/70 hover:text-white shadow-lg transition-colors"
        aria-label="导航菜单"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Mobile overlay ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar drawer ───────────────────────────────────── */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-[220px] bg-[#1e293b] transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Desktop fixed sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-[220px] bg-[#1e293b] z-30">
        <SidebarContent />
      </aside>
    </>
  )
}
