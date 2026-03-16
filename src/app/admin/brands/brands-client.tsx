'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addBrand, deleteBrand } from '@/app/actions/brands'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Brand {
  id: string
  name: string
  created_at: string
}

interface Props {
  brands: Brand[]
}

type State = { error: string } | { success: boolean } | undefined

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function BrandsClient({ brands }: Props) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)

  // Add brand action
  const wrappedAdd = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await addBrand(_prev, formData)
    if (result && 'success' in result && result.success) {
      setAddOpen(false)
      router.refresh()
    }
    return result
  }
  const [addState, addAction, addPending] = useActionState(wrappedAdd, undefined)

  // Delete brand action
  const wrappedDelete = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await deleteBrand(_prev, formData)
    if (result && 'success' in result && result.success) {
      setDeleteTarget(null)
      router.refresh()
    }
    return result
  }
  const [deleteState, deleteAction, deletePending] = useActionState(wrappedDelete, undefined)

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">品牌管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">共 {brands.length} 个品牌</p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          + 新增品牌
        </Button>
      </div>

      {/* Brands table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">品牌名称</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">创建时间</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {brands.map(brand => (
              <tr key={brand.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{brand.name}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(brand.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteTarget(brand)}
                  >
                    删除
                  </Button>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">暂无品牌</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add brand dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新增品牌</DialogTitle>
          </DialogHeader>
          <form action={addAction} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">品牌名称</Label>
              <Input
                id="brand-name"
                name="name"
                placeholder="例：Toyota"
                required
                autoFocus
              />
            </div>
            {addState && 'error' in addState && (
              <p className="text-sm text-red-600">{addState.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addPending}>
                取消
              </Button>
              <Button type="submit" disabled={addPending}>
                {addPending ? '添加中...' : '确认添加'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            确定要删除品牌 <strong>"{deleteTarget?.name}"</strong> 吗？此操作不可撤销。
          </p>
          {deleteState && 'error' in deleteState && (
            <p className="text-sm text-red-600">{deleteState.error}</p>
          )}
          <form action={deleteAction}>
            <input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
            <div className="flex gap-2 justify-end mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deletePending}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deletePending}
              >
                {deletePending ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
