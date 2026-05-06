-- ============================================
-- DIESEL ENTRY UPGRADE: Backdating, Locks, NEPA Period Logs
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Diesel level photo column on existing readings table
ALTER TABLE diesel_readings
  ADD COLUMN IF NOT EXISTS diesel_level_photo_url text;

-- 2. App-wide settings (key/value, used for diesel auto-lock days + photo requirement toggle)
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

INSERT INTO app_settings (key, value) VALUES
  ('diesel_auto_lock_days', '1'::jsonb),
  ('diesel_require_photo_backdated', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Manual diesel locks (admin can lock specific date ranges, optionally per store)
CREATE TABLE IF NOT EXISTS diesel_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location text,  -- NULL = applies to all stores
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text,
  locked_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diesel_locks_dates ON diesel_locks(from_date, to_date);

-- 4. NEPA period logs (custom date-range NEPA tracking, separate from daily diesel readings)
CREATE TABLE IF NOT EXISTS nepa_period_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_location text NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  total_hours numeric,
  meter_opening numeric,
  meter_closing numeric,
  photo_url text,
  notes text,
  submitted_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nepa_period_store ON nepa_period_logs(store_location, from_date);
