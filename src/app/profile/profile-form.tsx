'use client'

import { useActionState } from 'react'
import { updateDisplayName, updateEmail, updatePassword } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActionState = { error: string } | { success: string } | undefined

const ROLE_LABELS: Record<string, string> = {
  'Super Admin': '超级管理员',
  'Admin':       '管理员',
  'Controller':  'Controller',
  'Staff':       '员工',
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-purple-100 text-purple-700 border-purple-200',
  'Admin':       'bg-blue-100 text-blue-700 border-blue-200',
  'Controller':  'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/20',
  'Staff':       'bg-gray-100 text-gray-600 border-gray-200',
}

function StatusMsg({ state }: { state: ActionState }) {
  if (!state) return null
  if ('error' in state)
    return <p className="text-sm text-red-600">{state.error}</p>
  if ('success' in state)
    return <p className="text-sm text-green-600">✓ {state.success}</p>
  return null
}

interface Props {
  fullName: string | null
  email: string
  role: string
  createdAt: string
}

function NameForm({ fullName }: { fullName: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateDisplayName, undefined)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">显示姓名</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={fullName ?? ''}
          placeholder="请输入您的姓名"
          required
        />
      </div>
      <StatusMsg state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? '保存中...' : '保存姓名'}
      </Button>
    </form>
  )
}

function EmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateEmail, undefined)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">新邮箱地址</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={email}
          required
        />
        <p className="text-xs text-gray-400">当前邮箱：{email}</p>
      </div>
      <StatusMsg state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? '更新中...' : '更新邮箱'}
      </Button>
    </form>
  )
}

function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePassword, undefined)
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">新密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="至少 8 位"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">确认新密码</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="再次输入新密码"
          minLength={8}
          required
        />
      </div>
      <StatusMsg state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? '更新中...' : '更新密码'}
      </Button>
    </form>
  )
}

export default function ProfileForm({ fullName, email, role, createdAt }: Props) {
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS['Staff']
  const roleLabel = ROLE_LABELS[role] ?? role

  return (
    <div className="space-y-4">
      {/* Account info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">账号信息</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">当前邮箱</p>
            <p className="font-medium text-gray-900">{email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">账号角色</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">注册时间</p>
            <p className="text-gray-700">{new Date(createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">修改姓名</h2>
        <p className="text-sm text-gray-500 mb-5">修改在系统中显示的名称。</p>
        <NameForm fullName={fullName} />
      </div>

      {/* Email */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">修改邮箱</h2>
        <p className="text-sm text-gray-500 mb-5">更新后需使用新邮箱登录。</p>
        <EmailForm email={email} />
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">修改密码</h2>
        <p className="text-sm text-gray-500 mb-5">密码至少 8 位字符。</p>
        <PasswordForm />
      </div>
    </div>
  )
}
