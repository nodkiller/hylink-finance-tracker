'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  projectId: string
  projectName: string
  hasRecords: boolean
}

export default function DeleteProjectButton({ projectId, projectName, hasRecords }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('project_id', projectId)
      const result = await deleteProject(undefined, formData)
      if (result && 'error' in result) {
        setError(result.error)
      } else {
        router.push('/projects')
      }
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-7 text-xs px-3 border-red-200 text-red-600 hover:bg-red-50"
      >
        删除
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除项目</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <p className="text-sm text-gray-700">
              确定要删除项目 <span className="font-semibold">「{projectName}」</span> 吗？
            </p>
            {hasRecords && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                ⚠️ 该项目下的所有收入和支出记录也将被一并删除，此操作不可恢复。
              </div>
            )}
            {!hasRecords && (
              <p className="text-xs text-gray-400">此操作不可恢复。</p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
