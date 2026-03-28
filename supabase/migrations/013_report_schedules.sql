-- Report schedule delivery system
-- Allows controllers to schedule automated report emails

CREATE TABLE IF NOT EXISTS report_schedules (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type  text NOT NULL CHECK (report_type IN ('brand_pl', 'payment_aging', 'project_profitability')),
  frequency    text NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  day_of_week  int CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sun, 6=Sat
  day_of_month int CHECK (day_of_month >= 1 AND day_of_month <= 28),
  hour         int NOT NULL DEFAULT 9 CHECK (hour >= 0 AND hour <= 23),
  locale       text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'zh')),
  recipients   text[] NOT NULL DEFAULT '{}',
  filters      jsonb DEFAULT '{}',
  created_by   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enabled      boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  last_error   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Index for cron query: find enabled schedules at a given hour
CREATE INDEX idx_report_schedules_enabled_hour ON report_schedules (enabled, hour) WHERE enabled = true;

-- Index for user's schedules
CREATE INDEX idx_report_schedules_created_by ON report_schedules (created_by);
