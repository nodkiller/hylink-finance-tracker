-- ============================================================
-- Hylink Finance Tracker - Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE project_type AS ENUM ('Retainer', 'KOL', 'Ad-hoc');
CREATE TYPE project_status AS ENUM ('Pending Approval', 'Active', 'Completed', 'Reconciled');
CREATE TYPE revenue_status AS ENUM ('Paid', 'Unpaid', 'Overdue');
CREATE TYPE expense_status AS ENUM ('Pending Approval', 'Approved', 'Rejected', 'Paid');
CREATE TYPE user_role AS ENUM ('Staff', 'Controller');

-- ============================================================
-- TABLE 1: brands（品牌/客户表）
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial brands
INSERT INTO brands (name) VALUES
  ('Zeekr'),
  ('Chery'),
  ('OJ')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLE 2: projects（项目表）
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id           UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  name               TEXT NOT NULL,
  project_code       TEXT UNIQUE,
  type               project_type NOT NULL,
  estimated_revenue  DECIMAL(12, 2),
  status             project_status NOT NULL DEFAULT 'Pending Approval',
  notes              TEXT,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: revenues（收入表）
-- ============================================================
CREATE TABLE IF NOT EXISTS revenues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  description     TEXT,
  invoice_number  TEXT,
  amount          DECIMAL(12, 2) NOT NULL,
  status          revenue_status NOT NULL DEFAULT 'Unpaid',
  issue_date      DATE NOT NULL,
  received_date   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: expenses（支出/付款请求表）
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  description     TEXT NOT NULL,
  payee           TEXT NOT NULL,
  invoice_number  TEXT NOT NULL,
  amount          DECIMAL(12, 2) NOT NULL,
  status          expense_status NOT NULL DEFAULT 'Pending Approval',
  attachment_url  TEXT NOT NULL,
  approver_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_date    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 5: profiles（用户档案表）
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  role       user_role NOT NULL DEFAULT 'Staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'Staff'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE brands    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;

-- Basic policy: authenticated users can read all, will tighten later
CREATE POLICY "Authenticated users can read brands"
  ON brands FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read revenues"
  ON revenues FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read expenses"
  ON expenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Controllers can read all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'Controller'
    )
  );
