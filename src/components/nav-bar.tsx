'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/i18n/context'
import { logout } from '@/app/actions/auth'
import {
  LayoutDashboard,
  FolderOpen,
  BarChart2,
  Settings2,
  Users,
  Tag,
  SlidersHorizontal,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from 'lucide-react'

interface NavBarProps {
  hasDashboard: boolean
  hasReports: boolean
  hasUserAdmin: boolean
  hasAdminMenu: boolean
  hasSettings: boolean
  // Mobile extras
  userName?: string
  userRole?: string
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

function NavLink({
  href,
  icon: Icon,
  children,
  active,
  onClick,
}: {
  href: string
  icon: IconComponent
  children: React.ReactNode
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'text-[#2B6CB0] bg-[#2B6CB0]/[0.07]'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      <Icon size={14} />
      {children}
      {active && (
        <span className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-[#2B6CB0] rounded-full" />
      )}
    </Link>
  )
}

export default function NavBar({
  hasDashboard,
  hasReports,
  hasUserAdmin,
  hasAdminMenu,
  hasSettings,
  userName,
  userRole,
}: NavBarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [adminOpen, setAdminOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)

  // Close admin dropdown on outside click
  useEffect(() => {
    if (!adminOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAdminOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [adminOpen])

  // Close mobile menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const adminItems: { href: string; label: string; Icon: IconComponent }[] = []
  if (hasUserAdmin) adminItems.push({ href: '/admin/users', label: t('sidebar.users'), Icon: Users })
  if (hasAdminMenu) adminItems.push({ href: '/admin/brands', label: t('sidebar.brands'), Icon: Tag })
  if (hasSettings) adminItems.push({ href: '/admin/settings', label: t('sidebar.settings'), Icon: SlidersHorizontal })

  const isAdminActive = pathname.startsWith('/admin')

  return (
    <>
      {/* ── Mobile hamburger button ─────────────────────────────── */}
      <div ref={mobileRef} className="md:hidden relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label={t('common.navMenu')}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 py-1.5">
            {hasDashboard && (
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${isActive('/dashboard') ? 'bg-[#2B6CB0]/[0.07] text-[#2B6CB0] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <LayoutDashboard size={14} />{t('sidebar.dashboard')}
              </Link>
            )}
            <Link href="/projects" onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${isActive('/projects') ? 'bg-[#2B6CB0]/[0.07] text-[#2B6CB0] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <FolderOpen size={14} />{t('sidebar.projects')}
            </Link>
            {hasReports && (
              <Link href="/reports" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${isActive('/reports') ? 'bg-[#2B6CB0]/[0.07] text-[#2B6CB0] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <BarChart2 size={14} />{t('sidebar.reports')}
              </Link>
            )}
            {adminItems.map(({ href, label, Icon }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${pathname.startsWith(href) ? 'bg-[#2B6CB0]/[0.07] text-[#2B6CB0] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Icon size={14} />{label}
              </Link>
            ))}

            {/* Mobile profile + logout */}
            {(userName || userRole) && (
              <div className="border-t border-gray-100 mt-1 pt-1">
                <Link href="/profile" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                  <span className="w-5 h-5 rounded-full bg-[#2B6CB0]/10 text-[#2B6CB0] text-xs flex items-center justify-center font-bold shrink-0">
                    {userName?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                  <span className="truncate">{userName}</span>
                  {userRole && <span className="ml-auto text-xs text-gray-400 shrink-0">{userRole}</span>}
                </Link>
                <form action={logout}>
                  <button type="submit"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#E53E3E] hover:bg-red-50 transition-colors">
                    <LogOut size={14} />{t('common.logout')}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop horizontal nav ───────────────────────────────── */}
      <nav className="hidden md:flex items-center gap-0.5">
        {hasDashboard && (
          <NavLink href="/dashboard" icon={LayoutDashboard} active={isActive('/dashboard')}>
            {t('sidebar.dashboard')}
          </NavLink>
        )}

        <NavLink href="/projects" icon={FolderOpen} active={isActive('/projects')}>
          {t('sidebar.projects')}
        </NavLink>

        {hasReports && (
          <NavLink href="/reports" icon={BarChart2} active={isActive('/reports')}>
            {t('sidebar.reports')}
          </NavLink>
        )}

        {adminItems.length > 0 && (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setAdminOpen(v => !v)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isAdminActive
                  ? 'text-[#2B6CB0] bg-[#2B6CB0]/[0.07]'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Settings2 size={14} />
              {t('sidebar.adminPanel')}
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${adminOpen ? 'rotate-180' : ''}`}
              />
              {isAdminActive && (
                <span className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-[#2B6CB0] rounded-full" />
              )}
            </button>

            {adminOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 py-1">
                {adminItems.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setAdminOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      pathname.startsWith(href)
                        ? 'bg-[#2B6CB0]/[0.07] text-[#2B6CB0] font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
