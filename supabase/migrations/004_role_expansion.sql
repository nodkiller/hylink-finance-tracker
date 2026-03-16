-- ============================================================
-- 004_role_expansion.sql
-- Add Admin / Super Admin roles + approval settings table
-- ============================================================

-- Add new roles to enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Super Admin';

-- Add new expense status for super-admin approval tier
ALTER TYPE expense_status ADD VALUE IF NOT EXISTS 'Pending Super Approval';

-- ============================================================
-- Approval thresholds (single-row config table)
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_settings (
  id                INT PRIMARY KEY DEFAULT 1,
  auto_limit        DECIMAL(12,2) NOT NULL DEFAULT 1000,   -- ≤ this → auto Approved
  admin_limit       DECIMAL(12,2) NOT NULL DEFAULT 2000,   -- ≤ this → Pending Approval (Admin)
  super_admin_limit DECIMAL(12,2) NOT NULL DEFAULT 5000,   -- > admin_limit → Pending Super Approval
  updated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default row (id=1 always)
INSERT INTO approval_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE approval_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read approval_settings"
  ON approval_settings FOR SELECT TO authenticated USING (true);
