'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/i18n/context'
import { addBrand, updateBrand, toggleBrandStatus } from '@/app/actions/brands'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface BrandStat {
  id: string
  name: string
  is_active: boolean
  created_at: string
  project_count: number
  revenue: number
  expenses: number
  profit: number
}

type State = { error: string } | { success: boolean } | undefined

function fmt(n: number) {
  return `A$${n.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
}

function AddBrandDialog({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await addBrand(_prev, formData)
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
      <Button onClick={() => setOpen(true)}>{t('adminBrands.addBrand')}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('adminBrands.newBrand')}</DialogTitle></DialogHeader>
          <form action={formAction} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-brand-name">{t('adminBrands.brandName')}</Label>
              <Input id="add-brand-name" name="name" placeholder={t('adminBrands.brandPlaceholder')} required autoFocus />
            </div>
            {state && 'error' in state && <p className="text-sm text-red-600">{t(state.error)}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={pending}>{pending ? t('common.adding') : t('adminBrands.confirmAdd')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function EditNameDialog({ brand }: { brand: BrandStat }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await updateBrand(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      router.refresh()
    }
    return result
  }
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}
        className="h-7 px-2.5 text-xs border-gray-200 text-gray-600">
        {t('common.edit')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('adminBrands.editBrandName')}</DialogTitle></DialogHeader>
          <form action={formAction} className="space-y-4 pt-2">
            <input type="hidden" name="id" value={brand.id} />
            <div className="space-y-1.5">
              <Label htmlFor={`edit-name-${brand.id}`}>{t('adminBrands.brandName')}</Label>
              <Input
                id={`edit-name-${brand.id}`}
                name="name"
                defaultValue={brand.name}
                required
                autoFocus
              />
            </div>
            {state && 'error' in state && <p className="text-sm text-red-600">{t(state.error)}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={pending}>{pending ? t('common.saving') : t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ToggleStatusButton({ brand }: { brand: BrandStat }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  const action = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await toggleBrandStatus(_prev, formData)
    if (result && 'success' in result && result.success) {
      setToast(brand.is_active ? `✓ ${t('adminUsers.suspended2')}` : `✓ ${t('adminUsers.activated')}`)
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
        <input type="hidden" name="id" value={brand.id} />
        <input type="hidden" name="is_active" value={String(brand.is_active)} />
        {state && 'error' in state && (
          <p className="text-xs text-red-500 mb-1">{t(state.error)}</p>
        )}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
          className={`h-7 px-2.5 text-xs ${
            brand.is_active
              ? 'border-[#E53E3E]/40 text-[#E53E3E] hover:bg-[#E53E3E]/5'
              : 'border-[#38A169]/40 text-[#38A169] hover:bg-[#38A169]/5'
          }`}
        >
          {pending ? '...' : brand.is_active ? t('adminBrands.deactivate') : t('adminBrands.activate')}
        </Button>
      </form>
    </div>
  )
}

interface Props {
  brands: BrandStat[]
}

export default function BrandsClient({ brands }: Props) {
  const { t } = useTranslation()
  const activeCount = brands.filter(b => b.is_active).length
  const totalRevenue = brands.reduce((s, b) => s + b.revenue, 0)
  const totalExpenses = brands.reduce((s, b) => s + b.expenses, 0)
  const totalProfit = totalRevenue - totalExpenses

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminBrands.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {t('adminBrands.brandCount').replace('{count}', String(brands.length)).replace('{active}', String(activeCount))}
            {brands.length - activeCount > 0 && ` · ${t('adminBrands.brandCountSuspended').replace('{count}', String(brands.length - activeCount))}`}
          </p>
        </div>
        <AddBrandDialog onDone={() => {}} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('adminBrands.brandName')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{t('common.status')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('adminBrands.projects')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalRevenue')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalExpenses')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('reports.totalProfit')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {brands.map(b => (
              <tr
                key={b.id}
                className={`hover:bg-gray-50/50 transition-colors ${!b.is_active ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/brands/${b.id}`}
                    className="font-medium text-gray-900 hover:text-[#2B6CB0] hover:underline"
                  >
                    {b.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {b.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#38A169]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38A169]" />{t('adminUsers.active')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#E53E3E]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E53E3E]" />{t('adminUsers.suspendedLabel')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                  {b.project_count}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#38A169]">
                  {fmt(b.revenue)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#E53E3E]">
                  {fmt(b.expenses)}
                </td>
                <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${b.profit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>
                  {fmt(b.profit)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <EditNameDialog brand={b} />
                    <ToggleStatusButton brand={b} />
                  </div>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">{t('adminBrands.noBrands')}</td>
              </tr>
            )}
          </tbody>
          {brands.length > 0 && (
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-gray-600">{t('reports.total')}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-[#38A169]">{fmt(totalRevenue)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-[#E53E3E]">{fmt(totalExpenses)}</td>
                <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${totalProfit >= 0 ? 'text-[#2B6CB0]' : 'text-[#E53E3E]'}`}>{fmt(totalProfit)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}
