-- ============================================
-- BAKERY OVENS + BREAD BATCH TRACKING
-- Run this in Supabase SQL Editor BEFORE running scripts/setup_bakery_assets.py
-- ============================================

-- 1. Asset type on generators: 'generator' (default) or 'oven'.
--    Ovens reuse the whole diesel pipeline (readings, compliance, watchtower);
--    they just have no hour meter — their rate is litres per bread batch.
ALTER TABLE generators
  ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'generator';

-- 2. Bread batches produced per daily reading (ovens only; null for generators).
ALTER TABLE diesel_readings
  ADD COLUMN IF NOT EXISTS batches_produced numeric;
