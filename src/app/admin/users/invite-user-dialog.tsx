'use client'

import { useActionState, useState } from 'react'
import { inviteUser } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type State = { error: string } | { success: boolean } | undefined

export default function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('Staff')
  const [toast, setToast] = useState<string | null>(null)

  const wrappedInvite = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('role', role)
    const result = await inviteUser(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      setRole('Staff')
      setToast('✓ 邀请邮件已发送')
      setTimeout(() => setToast(null), 4000)
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrappedInvite, undefined)

  if (!open) {
    return (
      <>
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-[#3A7D44] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg font-mono">
            {toast}
          </div>
        )}
        <Button onClick={() => setOpen(true)}>邀请新用户</Button>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold">邀请新用户</h3>
          <p className="text-sm text-gray-500 mt-0.5">对方将收到邮件邀请链接</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">姓名</Label>
            <Input id="full_name" name="full_name" placeholder="张三" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="zhang@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>角色</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Controller">Controller</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state && 'error' in state && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '发送中...' : '发送邀请'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
