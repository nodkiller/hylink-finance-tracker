'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProject } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

interface Brand { id: string; name: string }

interface Project {
  id: string
  name: string
  type: string
  brand_id: string
  brand_name: string
  estimated_revenue: number | null
  project_code: string | null
  notes: string | null
}

interface Props {
  project: Project
  brands: Brand[]
}

type State = { error: string } | { success: boolean } | undefined

export default function EditProjectDialog({ project, brands }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [brandId, setBrandId] = useState(project.brand_id)
  const [type, setType] = useState(project.type)

  const wrapped = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('project_id', project.id)
    formData.set('brand_id', brandId)
    formData.set('type', type)
    const result = await updateProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrapped, undefined)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-7 text-xs px-3"
      >
        编辑
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑项目信息</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4 pt-2">
            {/* Project code */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">
                项目代码
                <span className="ml-2 text-xs font-normal text-gray-400">可手动填写或留空</span>
              </Label>
              <Input
                id="edit-code"
                name="project_code"
                defaultValue={project.project_code ?? ''}
                placeholder="例：Chery-2026-03"
                className="font-mono"
              />
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label>品牌 <span className="text-red-500">*</span></Label>
              <Select value={brandId} onValueChange={(v) => v && setBrandId(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">项目名称 <span className="text-red-500">*</span></Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={project.name}
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>项目类型 <span className="text-red-500">*</span></Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retainer">Retainer</SelectItem>
                  <SelectItem value="KOL">KOL</SelectItem>
                  <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated revenue */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-rev">预估收入 (AUD) <span className="text-red-500">*</span></Label>
              <Input
                id="edit-rev"
                name="estimated_revenue"
                type="number"
                min="0"
                step="0.01"
                defaultValue={project.estimated_revenue ?? 0}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">备注</Label>
              <Textarea
                id="edit-notes"
                name="notes"
                defaultValue={project.notes ?? ''}
                rows={2}
              />
            </div>

            {state && 'error' in state && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                取消
              </Button>
              <Button type="submit" disabled={pending || !brandId || !type}>
                {pending ? '保存中...' : '保存修改'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
