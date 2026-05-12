-- ============================================
-- OVERAGE TRACKING + PIE EXPRESS / WAREHOUSE LOCATION
-- Run this in Supabase SQL Editor before running the Akure 1 import.
-- ============================================

-- 1. Add is_overage flag to diesel_distributions so we can mark and report on overage supply
ALTER TABLE diesel_distributions
  ADD COLUMN IF NOT EXISTS is_overage boolean NOT NULL DEFAULT false;

-- 2. Add the Pie Express / Warehouse location used by the diesel supply records.
--    INSERT ... ON CONFLICT keeps this idempotent if the row already exists.
INSERT INTO locations (name)
SELECT 'Pie Express / Warehouse'
WHERE NOT EXISTS (
  SELECT 1 FROM locations WHERE name = 'Pie Express / Warehouse'
);
