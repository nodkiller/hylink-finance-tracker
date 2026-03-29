-- Accounting document archive for invoice/receipt uploads
-- Staff upload monthly, Controller generates magic links for accountant

CREATE TABLE IF NOT EXISTS accounting_documents (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month        text NOT NULL,                          -- 'YYYY-MM' format
  doc_type     text NOT NULL CHECK (doc_type IN ('invoice', 'receipt')),
  description  text,
  amount       numeric(12,2),
  file_url     text NOT NULL,
  file_name    text NOT NULL,
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,
  uploaded_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_accounting_docs_month ON accounting_documents (month);
CREATE INDEX idx_accounting_docs_uploaded_by ON accounting_documents (uploaded_by);

-- Magic links for accountant access (no login required)
CREATE TABLE IF NOT EXISTS accounting_links (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token        text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label        text,                                   -- e.g. 'Q1 2026 Documents'
  month_from   text NOT NULL,                          -- 'YYYY-MM'
  month_to     text NOT NULL,                          -- 'YYYY-MM'
  created_by   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_accounting_links_token ON accounting_links (token);
