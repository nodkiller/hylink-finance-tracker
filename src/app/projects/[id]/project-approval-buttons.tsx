'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/toast'
import { approveProject, rejectProject } from '@/app/actions/approval'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  projectId: string
  brandName: string
}

type State = { error: string } | { success: boolean; projectCode?: string } | undefined

export default function ProjectApprovalButtons({ projectId, brandName }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const wrappedApprove = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('project_id', projectId)
    formData.set('brand_name', brandName)
    const result = await approveProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      setApproveOpen(false)
      const code = (result as { success: boolean; projectCode?: string }).projectCode
      toast(code ? `项目已批准，项目代码：${code}` : '项目已批准', 'success')
      router.refresh()
    }
    return result
  }

  const wrappedReject = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('project_id', projectId)
    const result = await rejectProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      setRejectOpen(false)
      toast('项目申请已驳回', 'error')
      router.refresh()
    }
    return result
  }

  const [approveState, approveFormAction, approvePending] = useActionState(wrappedApprove, undefined)
  const [rejectState, rejectFormAction, rejectPending] = useActionState(wrappedReject, undefined)

  return (
    <>
      <Button
        size="sm"
        className="h-7 text-xs px-3 bg-[#38A169] hover:bg-[#2d6235] text-white border-0"
        onClick={() => setApproveOpen(true)}
      >
        批准项目
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs px-3 text-[#E53E3E] border-[#E53E3E]/40 hover:bg-[#E53E3E]/5 hover:text-[#E53E3E]"
        onClick={() => setRejectOpen(true)}
      >
        驳回项目
      </Button>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>批准项目申请</DialogTitle>
          </DialogHeader>
          <form action={approveFormAction} className="space-y-4 pt-2">
            <p className="text-sm text-gray-500">
              批准后系统将自动分配项目代码，项目状态变为 Active。
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="approve-comment">备注（可选）</Label>
              <Input id="approve-comment" name="comment" placeholder="审批说明..." />
            </div>
            {approveState && 'error' in approveState && (
              <p className="text-sm text-red-600">{approveState.error}</p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setApproveOpen(false)} disabled={approvePending}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={approvePending}
                className="bg-[#38A169] hover:bg-[#2d6235] text-white border-0">
                {approvePending ? (
                  <><svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/></svg>处理中</>
                ) : '确认批准'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>驳回项目申请</DialogTitle>
          </DialogHeader>
          <form action={rejectFormAction} className="space-y-4 pt-2">
            <p className="text-sm text-gray-500">
              驳回后项目状态变为 Rejected，申请人将无法继续操作。
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">驳回原因 <span className="text-red-500">*</span></Label>
              <Input id="reject-reason" name="reason" placeholder="请说明驳回原因..." required />
            </div>
            {rejectState && 'error' in rejectState && (
              <p className="text-sm text-red-600">{rejectState.error}</p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectOpen(false)} disabled={rejectPending}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={rejectPending}
                className="bg-[#E53E3E] hover:bg-[#a93226] text-white border-0">
                {rejectPending ? (
                  <><svg className="animate-spin w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4z"/></svg>处理中</>
                ) : '确认驳回'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
