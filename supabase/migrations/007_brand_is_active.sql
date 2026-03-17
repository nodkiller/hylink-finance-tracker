-- ============================================================
-- 007_brand_is_active.sql
-- Add is_active flag to brands for suspend/activate
-- ============================================================

ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
