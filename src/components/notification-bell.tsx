'use client'

import { useState, useEffect, useTransition } from 'react'
import { Bell } from 'lucide-react'
import {
  markNotificationRead,
  markAllNotificationsRead,
  fetchNotifications,
  type NotificationItem,
} from '@/app/actions/notifications'
import { useRouter } from 'next/navigation'

const TYPE_ICON: Record<string, string> = {
  project_submitted:  '📋',
  project_approved:   '✅',
  project_rejected:   '❌',
  expense_submitted:  '💰',
  expense_approved:   '✅',
  expense_rejected:   '❌',
  revenue_overdue:    '⚠️',
}

export default function NotificationBell({
  initialUnread,
  initialNotifications,
}: {
  initialUnread: number
  initialNotifications: NotificationItem[]
}) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unread, setUnread] = useState(initialUnread)
  const [, startTransition] = useTransition()
  const router = useRouter()

  // Poll every 60s for new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(async () => {
        const result = await fetchNotifications()
        if (result) {
          setNotifications(result.notifications)
          setUnread(result.unread)
        }
      })
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  async function handleClick(notif: NotificationItem) {
    if (!notif.is_read) {
      await markNotificationRead(notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    }
    setOpen(false)
    if (notif.link) router.push(notif.link)
  }

  async function handleMarkAll() {
    await markAllNotificationsRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="通知"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-[#E53E3E] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">通知</span>
                {unread > 0 && (
                  <span className="text-xs bg-[#E53E3E]/10 text-[#E53E3E] px-1.5 py-0.5 rounded-full font-medium">
                    {unread} 未读
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-[#2B6CB0] hover:underline"
                >
                  全部已读
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-400 text-sm">
                  暂无通知
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors ${!n.is_read ? 'bg-[#2B6CB0]/[0.03]' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 text-base leading-none mt-0.5">
                        {TYPE_ICON[n.type] ?? '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>
                        )}
                        <p className="text-[11px] text-gray-300 mt-1">
                          {new Date(n.created_at).toLocaleString('zh-CN', {
                            month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-[#2B6CB0] rounded-full mt-1.5" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
