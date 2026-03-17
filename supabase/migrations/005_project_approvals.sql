-- 005_project_approvals.sql
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_approvals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action      text        NOT NULL CHECK (action IN ('approved', 'rejected')),
  comment     text,
  approved_by uuid        NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_approvals_project_id_idx ON project_approvals(project_id);
CREATE INDEX IF NOT EXISTS project_approvals_created_at_idx ON project_approvals(created_at DESC);
