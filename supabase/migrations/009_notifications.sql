-- ============================================================
-- 009_notifications.sql
-- Notifications table + expenses.created_by
-- ============================================================

-- Add created_by to expenses (track who submitted each expense)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  body         TEXT,
  link         TEXT,
  reference_id TEXT,
  is_read      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications (user_id, is_read, created_at DESC);

-- Dedup: same user cannot receive same type+reference_id twice
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_idx
  ON notifications (user_id, type, reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
