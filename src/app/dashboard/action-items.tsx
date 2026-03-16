'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveProject, rejectProject } from '@/app/actions/approval'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export interface PendingProject {
  id: string
  name: string
  brand_name: string
  estimated_revenue: number | null
  applicant_name: string | null
  created_at: string
}

type State = { error: string } | { success: boolean; projectCode?: string } | undefined

function formatCurrency(n: number | null) {
  if (n == null) return '—'
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function ApproveButton({ project, onDone }: { project: PendingProject; onDone: () => void }) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await approveProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      setToast(`✓ 已批准 · 项目代码：${result.projectCode}`)
      setTimeout(() => { setToast(null); onDone(); router.refresh() }, 4000)
    }
    return result
  }

  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <div className="relative">
      {toast && (
        <div className="absolute -top-10 right-0 bg-green-700 text-white text-xs px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap z-10 font-mono">
          {toast}
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="project_id" value={project.id} />
        <input type="hidden" name="brand_name" value={project.brand_name} />
        {state && 'error' in state && (
          <p className="text-xs text-red-500 mb-1">{state.error}</p>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="bg-[#3A7D44] hover:bg-[#2d6336] text-white h-7 px-3 text-xs"
        >
          {pending ? '...' : '批准'}
        </Button>
      </form>
    </div>
  )
}

function RejectButton({ project, onDone }: { project: PendingProject; onDone: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await rejectProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false); onDone(); router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-[#C0392B]/40 text-[#C0392B] hover:bg-[#C0392B]/5 h-7 px-3 text-xs"
      >
        拒绝
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>拒绝项目申请</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">
            项目：<span className="font-medium text-gray-900">{project.brand_name} · {project.name}</span>
          </p>
          <form action={formAction} className="space-y-4 pt-1">
            <input type="hidden" name="project_id" value={project.id} />
            <div className="space-y-1.5">
              <Label htmlFor="proj-reason">拒绝原因（选填）</Label>
              <Textarea id="proj-reason" name="reason" placeholder="请说明拒绝原因..." rows={3} autoFocus />
            </div>
            {state && 'error' in state && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>取消</Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? '处理中...' : '确认拒绝'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface Props {
  projects: PendingProject[]
}

// Now renders just the list content (card shell is in dashboard/page.tsx)
export default function ActionItems({ projects: initial }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = initial.filter(p => !dismissed.has(p.id))
  const dismiss = (id: string) => setDismissed(prev => new Set([...prev, id]))

  if (visible.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-400 text-sm">
        暂无待审批项目 ✓
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {visible.map(p => (
        <div key={p.id} className="px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {p.brand_name}
              </span>
              <Link href={`/projects/${p.id}`} className="font-medium text-sm text-gray-900 truncate mt-0.5 hover:text-[#2A4A6B] hover:underline block">{p.name}</Link>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                <span>预估 <span className="font-medium text-gray-700">{formatCurrency(p.estimated_revenue)}</span></span>
                <span>·</span>
                <span>{p.applicant_name ?? '未知'}</span>
                <span>·</span>
                <span>{formatDateTime(p.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
              <ApproveButton project={p} onDone={() => dismiss(p.id)} />
              <RejectButton project={p} onDone={() => dismiss(p.id)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

