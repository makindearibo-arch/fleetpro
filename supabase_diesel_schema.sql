-- ============================================
-- DIESEL TRACKING MODULE - Phase 1 Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add store_location to profiles (ties Store Staff to their store)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_location TEXT DEFAULT NULL;

-- 2. Update role options (Store Staff is now a valid role)
-- No schema change needed - just use 'Store Staff' as role value

-- 3. Daily Diesel Readings (staff submit once daily per generator)
CREATE TABLE IF NOT EXISTS diesel_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generator_id TEXT NOT NULL,
  store_location TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Generator meter readings
  gen_hours_opening NUMERIC,
  gen_hours_closing NUMERIC,
  hours_run NUMERIC GENERATED ALWAYS AS (
    CASE WHEN gen_hours_closing IS NOT NULL AND gen_hours_opening IS NOT NULL
    THEN gen_hours_closing - gen_hours_opening ELSE NULL END
  ) STORED,

  -- Diesel level tracking
  diesel_level_actual NUMERIC,         -- Staff-reported actual litres in tank
  diesel_level_theoretical NUMERIC,    -- System-calculated expected litres
  diesel_added NUMERIC DEFAULT 0,      -- Litres added/refueled that day

  -- Consumption tracking
  consumption_litres NUMERIC,          -- Calculated: theoretical burn for hours run
  consumption_rate NUMERIC,            -- L/hr for this reading

  -- Photo evidence
  gen_photo_url TEXT,
  gen_photo_reading_source TEXT DEFAULT 'photo', -- 'photo' or 'manual'

  -- AI extraction metadata
  ai_readings_json JSONB,
  ai_confidence TEXT,

  -- NEPA / public power
  nepa_hours NUMERIC DEFAULT 0,
  nepa_meter_opening NUMERIC,
  nepa_meter_closing NUMERIC,
  nepa_photo_url TEXT,
  nepa_source TEXT DEFAULT 'manual',   -- 'photo' or 'manual'

  -- Discrepancy tracking
  discrepancy_litres NUMERIC,          -- actual - theoretical
  discrepancy_flag BOOLEAN DEFAULT FALSE,

  -- Meta
  submitted_by UUID,
  notes TEXT,
  location_geo JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by store and date
CREATE INDEX IF NOT EXISTS idx_diesel_readings_store_date
  ON diesel_readings(store_location, date DESC);
CREATE INDEX IF NOT EXISTS idx_diesel_readings_generator
  ON diesel_readings(generator_id, date DESC);

-- 4. Diesel Purchases (admin logs bulk buys)
CREATE TABLE IF NOT EXISTS diesel_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT NOT NULL,
  litres NUMERIC NOT NULL,
  price_per_litre NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (litres * price_per_litre) STORED,
  notes TEXT,
  purchased_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diesel_purchases_date
  ON diesel_purchases(date DESC);

-- 5. Diesel Distributions (admin allocates to stores)
CREATE TABLE IF NOT EXISTS diesel_distributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES diesel_purchases(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  store_location TEXT NOT NULL,
  litres NUMERIC NOT NULL,
  received_confirmed BOOLEAN DEFAULT FALSE,
  received_date DATE,
  received_by UUID,
  notes TEXT,
  distributed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diesel_distributions_store
  ON diesel_distributions(store_location, date DESC);
CREATE INDEX IF NOT EXISTS idx_diesel_distributions_purchase
  ON diesel_distributions(purchase_id);

-- 6. Store Diesel Stock (running ledger per store)
CREATE TABLE IF NOT EXISTS store_diesel_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_location TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_stock NUMERIC DEFAULT 0,
  received NUMERIC DEFAULT 0,
  consumed NUMERIC DEFAULT 0,
  closing_stock NUMERIC DEFAULT 0,
  source TEXT,              -- 'distribution', 'reading', 'adjustment'
  reference_id UUID,        -- links to distribution or reading
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_stock_location
  ON store_diesel_stock(store_location, date DESC);

-- 7. Generator baselines (learned consumption rates per generator)
CREATE TABLE IF NOT EXISTS generator_baselines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generator_id TEXT NOT NULL UNIQUE,
  avg_litres_per_hour NUMERIC,
  baseline_readings_count INTEGER DEFAULT 0,
  last_calculated TIMESTAMPTZ,
  min_rate NUMERIC,
  max_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS Policies (Row Level Security)
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE diesel_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diesel_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE diesel_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_diesel_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE generator_baselines ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (app handles role filtering)
CREATE POLICY "Authenticated users can read diesel_readings" ON diesel_readings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert diesel_readings" ON diesel_readings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update diesel_readings" ON diesel_readings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read diesel_purchases" ON diesel_purchases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert diesel_purchases" ON diesel_purchases
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read diesel_distributions" ON diesel_distributions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert diesel_distributions" ON diesel_distributions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update diesel_distributions" ON diesel_distributions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read store_diesel_stock" ON store_diesel_stock
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert store_diesel_stock" ON store_diesel_stock
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read generator_baselines" ON generator_baselines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can all generator_baselines" ON generator_baselines
  FOR ALL TO authenticated USING (true);
