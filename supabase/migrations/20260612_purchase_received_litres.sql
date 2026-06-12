-- ============================================
-- DIESEL EXCESS: paid vs received litres on purchases
-- Run in Supabase SQL Editor.
-- ============================================
-- diesel_purchases.litres        = PAID litres (what you ordered/paid for; drives cost)
-- diesel_purchases.litres_received = ACTUAL litres that came out of the tanker
--                                    (drives physical stock). NULL = same as paid
--                                    (no excess recorded). Excess = received - paid.

ALTER TABLE diesel_purchases
  ADD COLUMN IF NOT EXISTS litres_received numeric;
