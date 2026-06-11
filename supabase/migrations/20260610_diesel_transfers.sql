-- ============================================
-- DIESEL TRANSFER TRACKING (store tank/generator -> vehicle or oven)
-- Run in Supabase SQL Editor before using the Transfer feature.
-- ============================================

CREATE TABLE IF NOT EXISTS diesel_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  store_location text NOT NULL,
  source_generator_id text,          -- generators.id the diesel came FROM (the tank being drained)
  dest_type text NOT NULL DEFAULT 'vehicle',  -- 'vehicle' | 'oven' | 'other'
  dest_id text,                      -- vehicles.id or generators.id when matched; null if unknown
  dest_label text,                   -- name as recorded (e.g. 'LSD 80XA', 'Water Tanker', 'Bakery Oven')
  litres numeric NOT NULL,
  notes text,
  recorded_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diesel_transfers_src_date ON diesel_transfers(source_generator_id, date);
CREATE INDEX IF NOT EXISTS idx_diesel_transfers_store ON diesel_transfers(store_location, date);

-- Match the rest of the schema: RLS off, access enforced client-side.
ALTER TABLE diesel_transfers DISABLE ROW LEVEL SECURITY;
