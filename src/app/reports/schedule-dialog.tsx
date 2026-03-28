'use client'

import { useActionState, useState, useEffect } from 'react'
import { createSchedule, deleteSchedule } from '@/app/actions/reports'
import type { ReportSchedule } from '@/app/actions/reports'
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
import { useToast } from '@/components/toast'
import { useTranslation } from '@/i18n/context'
import { CalendarClock, Trash2 } from 'lucide-react'

type State = { error: string } | { success: boolean } | undefined

interface Props {
  schedules: ReportSchedule[]
  userRole?: string
}

const DAYS_OF_WEEK = [
  { value: '1', labelEn: 'Monday', labelZh: '周一' },
  { value: '2', labelEn: 'Tuesday', labelZh: '周二' },
  { value: '3', labelEn: 'Wednesday', labelZh: '周三' },
  { value: '4', labelEn: 'Thursday', labelZh: '周四' },
  { value: '5', labelEn: 'Friday', labelZh: '周五' },
  { value: '6', labelEn: 'Saturday', labelZh: '周六' },
  { value: '0', labelEn: 'Sunday', labelZh: '周日' },
]

const REPORT_TYPES = [
  { value: 'brand_pl', labelEn: 'Brand P&L', labelZh: '品牌损益表' },
  { value: 'payment_aging', labelEn: 'Payment Aging', labelZh: '付款账龄' },
  { value: 'project_profitability', labelEn: 'Project Profitability', labelZh: '项目利润率' },
]

export default function ScheduleDialog({ schedules, userRole }: Props) {
  const { t, locale } = useTranslation()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  // Form state
  const [reportType, setReportType] = useState('brand_pl')
  const [frequency, setFrequency] = useState('weekly')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [hour, setHour] = useState('9')
  const [recipients, setRecipients] = useState('')
  const [scheduleLocale, setScheduleLocale] = useState(locale === 'zh' ? 'zh' : 'en')

  // Hide for Staff
  if (userRole === 'Staff') return null

  const wrappedCreate = async (_prev: State, formData: FormData): Promise<State> => {
    // Set hidden fields from controlled state
    formData.set('report_type', reportType)
    formData.set('frequency', frequency)
    if (frequency === 'weekly') {
      formData.set('day_of_week', dayOfWeek)
    }
    if (frequency === 'monthly') {
      formData.set('day_of_month', dayOfMonth)
    }
    formData.set('hour', hour)
    formData.set('locale', scheduleLocale)
    formData.set('recipients', recipients)

    const result = await createSchedule(_prev, formData)
    if (result && 'success' in result && result.success) {
      toast(locale === 'zh' ? '定时发送已创建' : 'Schedule created', 'success')
      resetForm()
    }
    return result
  }

  const wrappedDelete = async (_prev: State, formData: FormData): Promise<State> => {
    const result = await deleteSchedule(_prev, formData)
    if (result && 'success' in result && result.success) {
      toast(locale === 'zh' ? '已删除' : 'Schedule deleted', 'success')
    }
    return result
  }

  const [createState, createAction, createPending] = useActionState(wrappedCreate, undefined)
  const [, deleteAction, deletePending] = useActionState(wrappedDelete, undefined)

  // Show error toasts
  useEffect(() => {
    if (createState && 'error' in createState) {
      const msg = t(createState.error) !== createState.error ? t(createState.error) : createState.error
      toast(msg, 'error')
    }
  }, [createState]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setReportType('brand_pl')
    setFrequency('weekly')
    setDayOfWeek('1')
    setDayOfMonth('1')
    setHour('9')
    setRecipients('')
    setScheduleLocale(locale === 'zh' ? 'zh' : 'en')
  }

  function getReportTypeLabel(type: string) {
    const found = REPORT_TYPES.find(r => r.value === type)
    return found ? (locale === 'zh' ? found.labelZh : found.labelEn) : type
  }

  function getDayLabel(freq: string, dow: number | null, dom: number | null) {
    if (freq === 'weekly' && dow !== null) {
      const found = DAYS_OF_WEEK.find(d => d.value === String(dow))
      return found ? (locale === 'zh' ? found.labelZh : found.labelEn) : `Day ${dow}`
    }
    if (freq === 'monthly' && dom !== null) {
      return locale === 'zh' ? `每月${dom}日` : `${dom}${getOrdinal(dom)} of month`
    }
    return ''
  }

  function getOrdinal(n: number) {
    if (n > 3 && n < 21) return 'th'
    switch (n % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  // Build hour options (7-19)
  const hourOptions = Array.from({ length: 13 }, (_, i) => i + 7)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <CalendarClock size={14} />
        {locale === 'zh' ? '定时发送' : 'Schedule Delivery'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {locale === 'zh' ? '定时报表发送' : 'Schedule Report Delivery'}
            </DialogTitle>
          </DialogHeader>

          <form action={createAction} className="space-y-4 pt-2">
            {/* Report Type */}
            <div className="space-y-1.5">
              <Label>{locale === 'zh' ? '报表类型' : 'Report Type'}</Label>
              <Select value={reportType} onValueChange={v => { if (v) setReportType(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {locale === 'zh' ? rt.labelZh : rt.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <Label>{locale === 'zh' ? '频率' : 'Frequency'}</Label>
              <Select value={frequency} onValueChange={v => { if (v) setFrequency(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{locale === 'zh' ? '每周' : 'Weekly'}</SelectItem>
                  <SelectItem value="monthly">{locale === 'zh' ? '每月' : 'Monthly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day of week (weekly only) */}
            {frequency === 'weekly' && (
              <div className="space-y-1.5">
                <Label>{locale === 'zh' ? '星期几' : 'Day of Week'}</Label>
                <Select value={dayOfWeek} onValueChange={v => { if (v) setDayOfWeek(v) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d.value} value={d.value}>
                        {locale === 'zh' ? d.labelZh : d.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day of month (monthly only) */}
            {frequency === 'monthly' && (
              <div className="space-y-1.5">
                <Label>{locale === 'zh' ? '每月几号' : 'Day of Month'}</Label>
                <Select value={dayOfMonth} onValueChange={v => { if (v) setDayOfMonth(v) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hour */}
            <div className="space-y-1.5">
              <Label>{locale === 'zh' ? '发送时间 (UTC+8)' : 'Send Time (UTC+8)'}</Label>
              <Select value={hour} onValueChange={v => { if (v) setHour(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipients */}
            <div className="space-y-1.5">
              <Label>{locale === 'zh' ? '收件人' : 'Recipients'}</Label>
              <Input
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
                placeholder={locale === 'zh' ? '多个邮箱用逗号分隔' : 'Comma-separated emails'}
              />
              <p className="text-xs text-gray-400">
                {locale === 'zh' ? '例：alice@example.com, bob@example.com' : 'e.g. alice@example.com, bob@example.com'}
              </p>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <Label>{locale === 'zh' ? '报表语言' : 'Language'}</Label>
              <Select value={scheduleLocale} onValueChange={v => { if (v) setScheduleLocale(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createState && 'error' in createState && (
              <p className="text-sm text-red-600">
                {t(createState.error) !== createState.error ? t(createState.error) : createState.error}
              </p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); resetForm() }}
                disabled={createPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createPending}>
                {createPending
                  ? (locale === 'zh' ? '创建中...' : 'Creating...')
                  : (locale === 'zh' ? '创建定时任务' : 'Create Schedule')}
              </Button>
            </div>
          </form>

          {/* Existing schedules */}
          {schedules.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {locale === 'zh' ? '已有定时任务' : 'Existing Schedules'}
              </h4>
              <div className="space-y-2">
                {schedules.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {getReportTypeLabel(s.report_type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.frequency === 'weekly'
                          ? (locale === 'zh' ? '每周' : 'Weekly')
                          : (locale === 'zh' ? '每月' : 'Monthly')}
                        {' · '}
                        {getDayLabel(s.frequency, s.day_of_week, s.day_of_month)}
                        {' · '}
                        {String(s.hour).padStart(2, '0')}:00
                        {' · '}
                        {s.recipients.length} {locale === 'zh' ? '位收件人' : 'recipient(s)'}
                      </p>
                    </div>
                    <form action={deleteAction}>
                      <input type="hidden" name="schedule_id" value={s.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        disabled={deletePending}
                        className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
