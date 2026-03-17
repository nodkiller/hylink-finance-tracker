-- ============================================================
-- 008_settings_expansion.sql
-- Expand approval_settings + add brand_approver_settings
-- ============================================================

-- New columns on approval_settings (id=1 singleton)
ALTER TABLE approval_settings
  ADD COLUMN IF NOT EXISTS overdue_days         INTEGER      NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS default_approver_id  UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delegate_approver_id UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delegate_active      BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delegate_until       DATE;

-- Per-brand approver override
CREATE TABLE IF NOT EXISTS brand_approver_settings (
  brand_id    UUID PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
  approver_id UUID             REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE brand_approver_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read brand_approver_settings"
  ON brand_approver_settings FOR SELECT TO authenticated USING (true);
