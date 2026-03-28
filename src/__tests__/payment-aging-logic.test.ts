import { describe, it, expect } from 'vitest'

// Pure logic tests for payment aging bucket calculation
// Extracted from the component logic for testability

function getAgingBucket(paymentDueDate: string | null | undefined, today: Date) {
  if (!paymentDueDate) return { bucket: 'no_date', bucketOrder: 5, days: 0 }
  const dueDate = new Date(paymentDueDate)
  const days = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  let bucket: string
  let bucketOrder: number
  if (days <= 0) { bucket = 'current'; bucketOrder = -1 }
  else if (days <= 30) { bucket = '1-30'; bucketOrder = 0 }
  else if (days <= 60) { bucket = '31-60'; bucketOrder = 1 }
  else if (days <= 90) { bucket = '61-90'; bucketOrder = 2 }
  else { bucket = '90+'; bucketOrder = 3 }
  return { bucket, bucketOrder, days }
}

function validateEmailList(emails: string): { valid: boolean; invalid: string[] } {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const list = emails.split(',').map(e => e.trim()).filter(Boolean)
  const invalid = list.filter(e => !re.test(e))
  return { valid: invalid.length === 0 && list.length > 0, invalid }
}

describe('Payment Aging Bucket Calculation', () => {
  const today = new Date('2026-03-28')

  it('returns current bucket for future due date', () => {
    const result = getAgingBucket('2026-04-15', today)
    expect(result.bucket).toBe('current')
    expect(result.days).toBeLessThanOrEqual(0)
  })

  it('returns 1-30 bucket for 15 days overdue', () => {
    const result = getAgingBucket('2026-03-13', today)
    expect(result.bucket).toBe('1-30')
    expect(result.days).toBe(15)
  })

  it('returns 31-60 bucket for 45 days overdue', () => {
    const result = getAgingBucket('2026-02-11', today)
    expect(result.bucket).toBe('31-60')
    expect(result.days).toBe(45)
  })

  it('returns 61-90 bucket for 75 days overdue', () => {
    const result = getAgingBucket('2026-01-12', today)
    expect(result.bucket).toBe('61-90')
    expect(result.days).toBe(75)
  })

  it('returns 90+ bucket for 120 days overdue', () => {
    const result = getAgingBucket('2025-11-28', today)
    expect(result.bucket).toBe('90+')
    expect(result.days).toBe(120)
  })

  it('returns no_date bucket for null payment_due_date', () => {
    const result = getAgingBucket(null, today)
    expect(result.bucket).toBe('no_date')
    expect(result.bucketOrder).toBe(5)
  })

  it('returns no_date bucket for undefined payment_due_date', () => {
    const result = getAgingBucket(undefined, today)
    expect(result.bucket).toBe('no_date')
  })

  it('returns current bucket for today due date (0 days)', () => {
    const result = getAgingBucket('2026-03-28', today)
    expect(result.bucket).toBe('current')
    expect(result.days).toBe(0)
  })

  it('returns 1-30 for exactly 1 day overdue', () => {
    const result = getAgingBucket('2026-03-27', today)
    expect(result.bucket).toBe('1-30')
    expect(result.days).toBe(1)
  })

  it('returns 1-30 for exactly 30 days overdue', () => {
    const result = getAgingBucket('2026-02-26', today)
    expect(result.bucket).toBe('1-30')
    expect(result.days).toBe(30)
  })

  it('returns 31-60 for exactly 31 days overdue', () => {
    const result = getAgingBucket('2026-02-25', today)
    expect(result.bucket).toBe('31-60')
    expect(result.days).toBe(31)
  })
})

describe('Email Validation', () => {
  it('accepts valid single email', () => {
    const result = validateEmailList('test@example.com')
    expect(result.valid).toBe(true)
    expect(result.invalid).toHaveLength(0)
  })

  it('accepts valid comma-separated emails', () => {
    const result = validateEmailList('a@test.com, b@test.com, c@test.com')
    expect(result.valid).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = validateEmailList('not-an-email')
    expect(result.valid).toBe(false)
    expect(result.invalid).toContain('not-an-email')
  })

  it('rejects mix of valid and invalid', () => {
    const result = validateEmailList('good@test.com, bad-email')
    expect(result.valid).toBe(false)
    expect(result.invalid).toContain('bad-email')
  })

  it('rejects empty string', () => {
    const result = validateEmailList('')
    expect(result.valid).toBe(false)
  })

  it('handles extra commas and whitespace', () => {
    const result = validateEmailList('  a@test.com ,  , b@test.com  ')
    expect(result.valid).toBe(true)
  })
})

describe('Cron Schedule Matching', () => {
  function matchesSchedule(
    schedule: { frequency: string; day_of_week: number | null; day_of_month: number | null; hour: number },
    currentHour: number,
    currentDow: number,
    currentDom: number
  ): boolean {
    if (schedule.hour !== currentHour) return false
    if (schedule.frequency === 'weekly' && schedule.day_of_week !== currentDow) return false
    if (schedule.frequency === 'monthly' && schedule.day_of_month !== currentDom) return false
    return true
  }

  it('matches weekly schedule on correct day and hour', () => {
    expect(matchesSchedule(
      { frequency: 'weekly', day_of_week: 1, day_of_month: null, hour: 9 },
      9, 1, 15
    )).toBe(true)
  })

  it('does not match weekly schedule on wrong day', () => {
    expect(matchesSchedule(
      { frequency: 'weekly', day_of_week: 1, day_of_month: null, hour: 9 },
      9, 3, 15
    )).toBe(false)
  })

  it('matches monthly schedule on correct day and hour', () => {
    expect(matchesSchedule(
      { frequency: 'monthly', day_of_week: null, day_of_month: 15, hour: 9 },
      9, 1, 15
    )).toBe(true)
  })

  it('does not match monthly schedule on wrong day of month', () => {
    expect(matchesSchedule(
      { frequency: 'monthly', day_of_week: null, day_of_month: 15, hour: 9 },
      9, 1, 20
    )).toBe(false)
  })

  it('does not match on wrong hour', () => {
    expect(matchesSchedule(
      { frequency: 'weekly', day_of_week: 1, day_of_month: null, hour: 9 },
      10, 1, 15
    )).toBe(false)
  })
})
