'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/projects'
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

interface Brand {
  id: string
  name: string
}

interface Props {
  brands: Brand[]
}

type State = { error: string } | { success: boolean } | undefined

export default function NewProjectDialog({ brands }: Props) {
  const [open, setOpen] = useState(false)
  const [brandId, setBrandId] = useState('')
  const [type, setType] = useState('')
  const router = useRouter()

  const wrappedCreate = async (_prev: State, formData: FormData): Promise<State> => {
    formData.set('brand_id', brandId)
    formData.set('type', type)
    const result = await createProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      setBrandId('')
      setType('')
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrappedCreate, undefined)

  const handleOpen = () => {
    setOpen(true)
  }

  return (
    <>
      <Button onClick={handleOpen} size="sm">+ 新项目申请</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新项目申请</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>品牌 <span className="text-red-500">*</span></Label>
              <Select value={brandId} onValueChange={(v) => v && setBrandId(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="选择客户品牌" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proj-name">项目名称 <span className="text-red-500">*</span></Label>
              <Input
                id="proj-name"
                name="name"
                placeholder="例：五月KOL推广"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>项目类型 <span className="text-red-500">*</span></Label>
              <Select value={type} onValueChange={(v) => v && setType(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="选择项目类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retainer">Retainer</SelectItem>
                  <SelectItem value="KOL">KOL</SelectItem>
                  <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="revenue">预估收入 (AUD) <span className="text-red-500">*</span></Label>
              <Input
                id="revenue"
                name="estimated_revenue"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500">SOP 要求申请时填写，供 Controller 审批参考</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="可选填补充说明..."
                rows={3}
              />
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
              <Button type="submit" disabled={pending || !brandId || !type}>
                {pending ? '提交中...' : '提交申请'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
