'use client'

import { useActionState, useState, useRef, useEffect } from 'react'
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
import { ChevronDown, Check } from 'lucide-react'
import { useToast } from '@/components/toast'

interface Brand {
  id: string
  name: string
}

interface Props {
  brands: Brand[]
}

type State = { error: string } | { success: boolean } | undefined

const TYPE_INFO: Record<string, string> = {
  'Retainer': '月度固定服务费合同，持续按月计费',
  'KOL':      '网红/博主推广合作，按效果或固定费用计费',
  'Ad-hoc':   '临时性项目，单次报价按需执行',
}

type FieldKey = 'brand' | 'name' | 'type' | 'revenue'
type FieldErrors = Partial<Record<FieldKey, string>>

function validateField(field: FieldKey, value: string): string | undefined {
  switch (field) {
    case 'brand':   return !value ? '请选择客户品牌' : undefined
    case 'name': {
      const v = value.trim()
      if (!v) return '请填写项目名称'
      if (v.length < 2) return '项目名称至少2个字符'
      return undefined
    }
    case 'type':    return !value ? '请选择项目类型' : undefined
    case 'revenue': {
      const n = parseFloat(value)
      if (!value) return '请填写预估收入'
      if (isNaN(n) || n <= 0) return '请输入有效金额（大于 0）'
      return undefined
    }
  }
}

function formatAUD(raw: string): string {
  const n = parseFloat(raw)
  if (isNaN(n)) return raw
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function NewProjectDialog({ brands }: Props) {
  const [open, setOpen]               = useState(false)
  const [brandId, setBrandId]         = useState('')
  const [type, setType]               = useState('')
  const [nameValue, setNameValue]     = useState('')
  const [revenueDisplay, setRevenueDisplay] = useState('')
  const [revenueRaw, setRevenueRaw]   = useState('')
  const [errors, setErrors]           = useState<FieldErrors>({})
  const [touched, setTouched]         = useState<Partial<Record<FieldKey, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Brand combobox
  const [brandSearch, setBrandSearch] = useState('')
  const [brandOpen, setBrandOpen]     = useState(false)
  const brandRef = useRef<HTMLDivElement>(null)

  const selectedBrandName = brands.find(b => b.id === brandId)?.name ?? ''
  const filteredBrands = brandSearch
    ? brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
    : brands

  useEffect(() => {
    if (!brandOpen) return
    function onOutside(e: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setBrandOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [brandOpen])

  function touchField(field: FieldKey, value: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
    setErrors(prev => ({ ...prev, [field]: validateField(field, value) }))
  }

  function showError(field: FieldKey): string | undefined {
    return (touched[field] || submitAttempted) ? errors[field] : undefined
  }

  function resetForm() {
    setBrandId(''); setBrandSearch(''); setType('')
    setNameValue(''); setRevenueDisplay(''); setRevenueRaw('')
    setErrors({}); setTouched({}); setSubmitAttempted(false)
  }

  const wrappedCreate = async (_prev: State, formData: FormData): Promise<State> => {
    setSubmitAttempted(true)
    const newErrors: FieldErrors = {
      brand:   validateField('brand', brandId),
      name:    validateField('name', nameValue),
      type:    validateField('type', type),
      revenue: validateField('revenue', revenueRaw),
    }
    setErrors(newErrors)
    setTouched({ brand: true, name: true, type: true, revenue: true })
    if (Object.values(newErrors).some(Boolean)) {
      return { error: '请检查上方标红的必填字段' }
    }

    formData.set('brand_id', brandId)
    formData.set('type', type)
    formData.set('estimated_revenue', revenueRaw)
    const result = await createProject(_prev, formData)
    if (result && 'success' in result && result.success) {
      setOpen(false)
      resetForm()
      toast('项目申请已提交，等待审批', 'success')
      router.refresh()
    }
    return result
  }

  const [state, formAction, pending] = useActionState(wrappedCreate, undefined)

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">+ 新项目申请</Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新项目申请</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4 pt-2">

            {/* ── 品牌（可搜索下拉）──────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>品牌 <span className="text-red-500">*</span></Label>
              <div ref={brandRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setBrandOpen(v => !v); if (!brandOpen) setBrandSearch('') }}
                  onBlur={() => !brandOpen && touchField('brand', brandId)}
                  className={`flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm shadow-xs transition-colors outline-none ${
                    showError('brand')
                      ? 'border-red-400 focus:ring-1 focus:ring-red-300'
                      : 'border-input hover:border-gray-400'
                  } ${brandId ? 'text-gray-900' : 'text-gray-400'}`}
                >
                  <span>{selectedBrandName || '选择客户品牌'}</span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ${brandOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {brandOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <input
                        autoFocus
                        type="text"
                        value={brandSearch}
                        onChange={e => setBrandSearch(e.target.value)}
                        placeholder="搜索品牌..."
                        className="w-full text-sm outline-none placeholder:text-gray-400"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto py-1">
                      {filteredBrands.length === 0 ? (
                        <p className="px-3 py-2.5 text-sm text-gray-400 text-center">无匹配品牌</p>
                      ) : filteredBrands.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onMouseDown={e => e.preventDefault()} // prevent blur on brandRef button
                          onClick={() => {
                            setBrandId(b.id)
                            setBrandOpen(false)
                            touchField('brand', b.id)
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                            b.id === brandId
                              ? 'bg-[#2B6CB0]/[0.06] text-[#2B6CB0] font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {b.name}
                          {b.id === brandId && <Check size={13} className="text-[#2B6CB0]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {showError('brand') && (
                <p className="text-xs text-red-500">{showError('brand')}</p>
              )}
            </div>

            {/* ── 项目名称 ───────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="proj-name">项目名称 <span className="text-red-500">*</span></Label>
              <Input
                id="proj-name"
                name="name"
                placeholder="例：五月KOL推广"
                value={nameValue}
                onChange={e => {
                  setNameValue(e.target.value)
                  if (touched.name) {
                    setErrors(prev => ({ ...prev, name: validateField('name', e.target.value) }))
                  }
                }}
                onBlur={() => touchField('name', nameValue)}
                className={showError('name') ? 'border-red-400 focus-visible:ring-red-200' : ''}
              />
              {showError('name') && (
                <p className="text-xs text-red-500">{showError('name')}</p>
              )}
            </div>

            {/* ── 项目类型（带说明）─────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>项目类型 <span className="text-red-500">*</span></Label>
              <Select
                value={type}
                onValueChange={v => { if (v) { setType(v); touchField('type', v) } }}
              >
                <SelectTrigger className={showError('type') ? 'border-red-400' : ''}>
                  <SelectValue placeholder="选择项目类型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_INFO).map(([val, desc]) => (
                    <SelectItem key={val} value={val} className="py-2.5">
                      <div>
                        <p className="font-medium text-sm leading-tight">{val}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showError('type') ? (
                <p className="text-xs text-red-500">{showError('type')}</p>
              ) : type ? (
                <p className="text-xs text-gray-400">{TYPE_INFO[type]}</p>
              ) : null}
            </div>

            {/* ── 预估收入（千分位格式化）───────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="proj-revenue">预估收入 (AUD) <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none">
                  A$
                </span>
                <Input
                  id="proj-revenue"
                  placeholder="0.00"
                  value={revenueDisplay}
                  onChange={e => {
                    // Allow digits, decimal point, commas (commas stripped for raw)
                    const raw = e.target.value.replace(/[^0-9.]/g, '')
                    setRevenueDisplay(e.target.value)
                    setRevenueRaw(raw)
                    if (touched.revenue) {
                      setErrors(prev => ({ ...prev, revenue: validateField('revenue', raw) }))
                    }
                  }}
                  onFocus={() => {
                    // Strip formatting so user can edit the raw number
                    if (revenueRaw) setRevenueDisplay(revenueRaw)
                  }}
                  onBlur={() => {
                    if (revenueRaw) setRevenueDisplay(formatAUD(revenueRaw))
                    touchField('revenue', revenueRaw)
                  }}
                  className={`pl-9 ${showError('revenue') ? 'border-red-400 focus-visible:ring-red-200' : ''}`}
                />
              </div>
              {/* Hidden field carries the raw numeric value to the server action */}
              <input type="hidden" name="estimated_revenue" value={revenueRaw} />
              {showError('revenue') ? (
                <p className="text-xs text-red-500">{showError('revenue')}</p>
              ) : (
                <p className="text-xs text-gray-500">SOP 要求申请时填写，供 Controller 审批参考</p>
              )}
            </div>

            {/* ── 备注 ──────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor="proj-notes">备注</Label>
              <Textarea
                id="proj-notes"
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
                onClick={() => { setOpen(false); resetForm() }}
                disabled={pending}
              >
                取消
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? '提交中...' : '提交申请'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
