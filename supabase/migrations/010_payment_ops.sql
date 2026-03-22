-- ============================================================
-- 010_payment_ops.sql
-- Payment operations: payment_due_date + audit log
-- ============================================================

-- 1. Add payment_due_date column (the scheduled payment cycle date)
-- Distinct from existing payment_date column (the actual date paid)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_due_date DATE;

-- 2. Create audit log for batch payment actions
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   UUID        NOT NULL,
  expense_id UUID        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  paid_by    UUID        NOT NULL REFERENCES profiles(id),
  paid_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_audit_batch_idx ON payment_audit_log (batch_id);
CREATE INDEX IF NOT EXISTS payment_audit_expense_idx ON payment_audit_log (expense_id);

-- 3. Backfill payment_due_date for existing expenses
-- Paid expenses: use the actual payment_date
UPDATE expenses
SET payment_due_date = payment_date::date
WHERE status = 'Paid' AND payment_date IS NOT NULL AND payment_due_date IS NULL;

-- Non-paid expenses: compute from created_at
-- If day <= 15 → 15th of that month
-- If day > 15 → min(30, last day of month)
UPDATE expenses
SET payment_due_date = CASE
  WHEN EXTRACT(DAY FROM created_at) <= 15 THEN
    (DATE_TRUNC('month', created_at) + INTERVAL '14 days')::date
  ELSE
    LEAST(
      (DATE_TRUNC('month', created_at) + INTERVAL '29 days')::date,
      (DATE_TRUNC('month', created_at) + INTERVAL '1 month' - INTERVAL '1 day')::date
    )
  END
WHERE payment_due_date IS NULL;
