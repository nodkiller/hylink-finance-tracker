-- ============================================================
-- 006_new_roles.sql
-- Add PM (Project Manager) and Viewer roles
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PM';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Viewer';
