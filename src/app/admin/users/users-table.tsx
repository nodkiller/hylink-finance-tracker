'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserRole, suspendUser, activateUser, sendPasswordReset } from '@/app/actions/user-management'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  is_suspended: boolean
  created_at: string
  is_self: boolean
}

type State = { error: string } | { success: boolean } | undefined

const ROLE_OPTIONS = [
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Controller', label: 'Controller' },
  { value: 'PM', label: 'PM' },
  { value: 'Viewer', label: 'Viewer' },
]

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700 border-purple-200',
  'Controller':  'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/20',
  'PM':          'bg-[#38A169]/10 text-[#38A169] border-[#38A169]/20',
  'Viewer':      'bg-gray-100 text-gray-500 border-gray-200',
  'Admin':       'bg-blue-100 text-blue-700 border-blue-200',
  'Staff':       'bg-gray-100 text-gray-500 border-gray-200',
}

function EditRoleDialog({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(user.role)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('role', role)
    const result = await updateUserRole(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      onDone()
      router.refresh()
    }
    return result
  }
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setRole(user.role); setOpen(true) }}
        className="h-7 px-2.5 text-xs border-gray-200 text-gray-600"
      >
        编辑角色
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>修改用户角色</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            用户：<span className="font-medium text-gray-900">{user.full_name || user.email}</span>
          </p>
          <form action={formAction} className="space-y-4 pt-1">
            <input type="hidden" name="user_id" value={user.id} />
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state && 'error' in state && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                取消
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SuspendButton({ user }: { user: UserRow }) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const fn = user.is_suspended ? activateUser : suspendUser
    const result = await fn(_prev, formData)
    if (result && 'success' in result && result.success) {
      setToast(user.is_suspended ? '✓ 已启用' : '✓ 已停用')
      setTimeout(() => { setToast(null); router.refresh() }, 1500)
    }
    return result
  }
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <div className="relative">
      {toast && (
        <div className="absolute -top-9 right-0 bg-gray-800 text-white text-xs px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-10">
          {toast}
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="user_id" value={user.id} />
        {state && 'error' in state && (
          <p className="text-xs text-red-500 mb-1">{state.error}</p>
        )}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending || user.is_self}
          className={`h-7 px-2.5 text-xs ${
            user.is_suspended
              ? 'border-[#38A169]/40 text-[#38A169] hover:bg-[#38A169]/5'
              : 'border-[#E53E3E]/40 text-[#E53E3E] hover:bg-[#E53E3E]/5'
          }`}
        >
          {pending ? '...' : user.is_suspended ? '启用' : '停用'}
        </Button>
      </form>
    </div>
  )
}

function ResetPasswordButton({ user }: { user: UserRow }) {
  const [toast, setToast] = useState<string | null>(null)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await sendPasswordReset(_prev, formData)
    if (result && 'success' in result && result.success) {
      setToast('✓ 重置邮件已发送')
      setTimeout(() => setToast(null), 3000)
    }
    return result
  }
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <div className="relative">
      {toast && (
        <div className="absolute -top-9 right-0 bg-[#38A169] text-white text-xs px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-10">
          {toast}
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="email" value={user.email} />
        {state && 'error' in state && (
          <p className="text-xs text-red-500 mb-1">{state.error}</p>
        )}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
          className="h-7 px-2.5 text-xs border-gray-200 text-gray-600"
        >
          {pending ? '...' : '重置密码'}
        </Button>
      </form>
    </div>
  )
}

interface Props {
  users: UserRow[]
}

export default function UsersTable({ users: initial }: Props) {
  const [localUsers, setLocalUsers] = useState(initial)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">姓名</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">邮箱</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">角色</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">状态</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">注册时间</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {localUsers.map((u) => (
            <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${u.is_suspended ? 'opacity-60' : ''}`}>
              <td className="px-4 py-3 font-medium text-gray-900">
                {u.full_name || <span className="text-gray-400 italic">未设置</span>}
                {u.is_self && <span className="ml-1.5 text-xs text-gray-400">(你)</span>}
              </td>
              <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.email}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROLE_COLORS[u.role] ?? ROLE_COLORS['Staff']}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3">
                {u.is_suspended ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#E53E3E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E53E3E]" />
                    已停用
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#38A169]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38A169]" />
                    启用
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {new Date(u.created_at).toLocaleDateString('zh-CN')}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  {!u.is_self && (
                    <EditRoleDialog user={u} onDone={() => {}} />
                  )}
                  <SuspendButton user={u} />
                  <ResetPasswordButton user={u} />
                </div>
              </td>
            </tr>
          ))}
          {localUsers.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                暂无用户
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
