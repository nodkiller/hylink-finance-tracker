import { describe, it, expect } from 'vitest'
import { getNextPaymentDueDate } from '../payments'

describe('getNextPaymentDueDate', () => {
  it('Jan 10 → Jan 15', () => {
    expect(getNextPaymentDueDate(new Date(2026, 0, 10))).toBe('2026-01-15')
  })

  it('Jan 15 → Jan 15 (boundary)', () => {
    expect(getNextPaymentDueDate(new Date(2026, 0, 15))).toBe('2026-01-15')
  })

  it('Jan 16 → Jan 30', () => {
    expect(getNextPaymentDueDate(new Date(2026, 0, 16))).toBe('2026-01-30')
  })

  it('Jan 30 → Jan 30 (boundary)', () => {
    expect(getNextPaymentDueDate(new Date(2026, 0, 30))).toBe('2026-01-30')
  })

  it('Jan 31 → Feb 15 (past 30th)', () => {
    expect(getNextPaymentDueDate(new Date(2026, 0, 31))).toBe('2026-02-15')
  })

  it('Feb 16 → Feb 28 (non-leap year, min(30, 28) = 28)', () => {
    expect(getNextPaymentDueDate(new Date(2026, 1, 16))).toBe('2026-02-28')
  })

  it('Feb 16 → Feb 28 in leap year 2028 (min(30, 29) = 29)', () => {
    expect(getNextPaymentDueDate(new Date(2028, 1, 16))).toBe('2028-02-29')
  })

  it('Feb 1 → Feb 15', () => {
    expect(getNextPaymentDueDate(new Date(2026, 1, 1))).toBe('2026-02-15')
  })

  it('Dec 16 → Dec 30', () => {
    expect(getNextPaymentDueDate(new Date(2026, 11, 16))).toBe('2026-12-30')
  })

  it('Dec 31 → Jan 15 next year', () => {
    expect(getNextPaymentDueDate(new Date(2026, 11, 31))).toBe('2027-01-15')
  })

  it('Mar 16 → Mar 30 (31-day month, min(30,31) = 30)', () => {
    expect(getNextPaymentDueDate(new Date(2026, 2, 16))).toBe('2026-03-30')
  })

  it('Apr 16 → Apr 30 (30-day month)', () => {
    expect(getNextPaymentDueDate(new Date(2026, 3, 16))).toBe('2026-04-30')
  })
})
