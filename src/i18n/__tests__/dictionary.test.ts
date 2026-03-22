import { describe, it, expect } from 'vitest'
import { createT } from '../dictionary'

describe('createT (translation function)', () => {
  const dict = {
    common: { cancel: 'Cancel', save: 'Save' },
    dashboard: { title: 'Dashboard', nested: { deep: 'Deep Value' } },
    status: { active: 'Active', pendingApproval: 'Pending Approval' },
  }

  const t = createT(dict)

  it('resolves top-level keys', () => {
    expect(t('common.cancel')).toBe('Cancel')
    expect(t('common.save')).toBe('Save')
  })

  it('resolves nested keys', () => {
    expect(t('dashboard.title')).toBe('Dashboard')
    expect(t('status.active')).toBe('Active')
  })

  it('resolves deeply nested keys', () => {
    expect(t('dashboard.nested.deep')).toBe('Deep Value')
  })

  it('returns the key itself for missing keys', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key')
    expect(t('common.doesNotExist')).toBe('common.doesNotExist')
  })

  it('returns key for empty string input', () => {
    expect(t('')).toBe('')
  })

  it('returns key when namespace exists but key does not', () => {
    expect(t('dashboard.missing')).toBe('dashboard.missing')
  })
})
