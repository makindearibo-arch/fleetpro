-- ============================================================================
-- OVENS: PANS FIRED (2026-10-14).
-- ============================================================================
-- Bakeries fire pans with the oven's diesel as well as baking bread batches, so
-- the day's diesel is spread over both. Makinde: a pan fired counts like a
-- batch, so an oven's diesel rate = litres used / (batches + pans fired).
-- Older readings have no pans (NULL) and keep litres / batches. The row-level
-- access rules of 20261005_access_rules.sql already cover the new column
-- (store staff record it on their own store's readings). Safe to re-run.
-- ============================================================================

alter table public.diesel_readings add column if not exists pans_fired numeric;
alter table public.diesel_readings drop constraint if exists diesel_readings_pans_fired_check;
alter table public.diesel_readings add constraint diesel_readings_pans_fired_check check (pans_fired is null or pans_fired >= 0);

-- Proof it took (expect one row: pans_column = 1):
select count(*) as pans_column from information_schema.columns
 where table_schema = 'public' and table_name = 'diesel_readings' and column_name = 'pans_fired';
