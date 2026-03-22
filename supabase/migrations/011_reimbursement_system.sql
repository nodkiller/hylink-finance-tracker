-- ============================================================
-- 011_reimbursement_system.sql
-- Reimbursement system + email logs + profile bank accounts
-- ============================================================

-- 1. Reimbursement table
CREATE TABLE IF NOT EXISTS reimbursements (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reimbursement_no    TEXT        UNIQUE,
  title               TEXT        NOT NULL,
  category            TEXT        NOT NULL CHECK (category IN ('travel','transport','dining','office','other')),
  project_id          UUID        REFERENCES projects(id) ON DELETE SET NULL,
  amount              DECIMAL(12,2) NOT NULL,
  expense_date        DATE        NOT NULL,
  description         TEXT,
  receipt_urls        TEXT[]      NOT NULL DEFAULT '{}',
  bank_bsb            TEXT        NOT NULL,
  bank_account        TEXT        NOT NULL,
  bank_account_name   TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','pending','needs_info','approved','paid','rejected')),
  submitted_by        UUID        NOT NULL REFERENCES profiles(id),
  submitted_at        TIMESTAMPTZ,
  approved_by         UUID        REFERENCES profiles(id),
  approved_at         TIMESTAMPTZ,
  approval_comment    TEXT,
  paid_at             TIMESTAMPTZ,
  paid_by             UUID        REFERENCES profiles(id),
  last_email_sent_at  TIMESTAMPTZ,
  email_sent_count    INTEGER     DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS reimbursements_submitted_by_idx ON reimbursements (submitted_by);
CREATE INDEX IF NOT EXISTS reimbursements_status_idx ON reimbursements (status);

-- Reimbursement number auto-generation trigger
CREATE OR REPLACE FUNCTION generate_reimbursement_no()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reimbursement_no, '-', 3) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM reimbursements
  WHERE reimbursement_no LIKE 'RB-' || year_str || '-%';

  NEW.reimbursement_no := 'RB-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reimbursement_no
  BEFORE INSERT ON reimbursements
  FOR EACH ROW
  WHEN (NEW.reimbursement_no IS NULL)
  EXECUTE FUNCTION generate_reimbursement_no();

-- 2. Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id          UUID        REFERENCES expenses(id) ON DELETE SET NULL,
  reimbursement_id    UUID        REFERENCES reimbursements(id) ON DELETE SET NULL,
  email_type          TEXT        NOT NULL,
  to_emails           TEXT[]      NOT NULL,
  cc_emails           TEXT[],
  subject             TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','sent','failed')),
  error_message       TEXT,
  sent_by             UUID        REFERENCES profiles(id) NOT NULL,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_logs_expense_idx ON email_logs (expense_id);
CREATE INDEX IF NOT EXISTS email_logs_reimbursement_idx ON email_logs (reimbursement_id);

-- 3. Add email tracking to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS email_sent_count INTEGER DEFAULT 0;

-- 4. Add bank account fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_bsb TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_name TEXT;

-- 5. Add email settings to approval_settings
ALTER TABLE approval_settings ADD COLUMN IF NOT EXISTS default_email_to TEXT[];
ALTER TABLE approval_settings ADD COLUMN IF NOT EXISTS default_email_cc TEXT[];
ALTER TABLE approval_settings ADD COLUMN IF NOT EXISTS email_sender_name TEXT DEFAULT 'Hylink Finance Tracker';
