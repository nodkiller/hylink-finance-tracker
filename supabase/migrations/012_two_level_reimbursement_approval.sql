-- Add controller_approved status to reimbursements
-- This enables two-level approval: Controller → Super Admin
-- Execute in Supabase SQL Editor

-- The status column uses TEXT with no enum constraint,
-- so no schema change is needed. The new status 'controller_approved'
-- is enforced at the application level.

-- Verify: SELECT DISTINCT status FROM reimbursements;
-- Expected statuses: draft, pending, needs_info, controller_approved, approved, paid, rejected
