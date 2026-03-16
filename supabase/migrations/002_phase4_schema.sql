-- Phase 4: Add Rejected status and rejection_reason to projects
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'Rejected';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
