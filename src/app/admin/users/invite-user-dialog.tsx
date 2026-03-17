'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteUser } from '@/app/actions/user-management'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

type State = { error: string } | { success: boolean } | undefined

const ROLE_OPTIONS = [
  { value: 'Controller', label: 'Controller — 财务审批 + 全项目' },
  { value: 'PM', label: 'PM — 创建项目 + 收支管理' },
  { value: 'Viewer', label: 'Viewer — 只读查看' },
]

export default function InviteUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('PM')
  const [toast, setToast] = useState<string | null>(null)

  const wrapped = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('role', role)
    const result = await inviteUser(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      setRole('PM')
      setToast('✓ 邀请邮件已发送')
      setTimeout(() => { setToast(null); router.refresh() }, 3000)
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrapped, undefined)

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#38A169] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <Button onClick={() => setOpen(true)}>邀请新用户</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>邀请新用户</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">对方将收到邮件邀请链接以设置密码</p>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">姓名</Label>
              <Input id="inv-name" name="full_name" placeholder="张三" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-email">邮箱</Label>
              <Input id="inv-email" name="email" type="email" placeholder="zhang@example.com" required />
            </div>

            <div className="space-y-1.5">
              <Label>角色</Label>
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
            </div>

            {state && 'error' in state && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                取消
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? '发送中...' : '发送邀请'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
