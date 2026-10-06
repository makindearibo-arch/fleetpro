-- ============================================================================
-- DIESEL ROUTES: where a purchase went, and where a delivery came from.
-- ============================================================================
-- Real life: diesel is bought, offloaded into the ONE main tank, loaded into
-- the ONE distribution tanker and delivered to stores. Sometimes a supplier
-- delivers straight to one or more stores instead.
--
-- diesel_purchases.destination   'main'   offloaded into the main tank (default)
--                                'direct' delivered straight to stores
-- diesel_distributions.source    'tanker' delivered from the distribution tanker
--                                'direct' delivered straight from a supplier
--                                (linked to that purchase); NULL on older rows,
--                                which the app treats as the tanker
--
-- Existing purchases become 'main'. Access rules and change history already
-- cover both tables (store staff still may only ACCEPT a delivery -- the
-- fp_guard_distribution trigger rejects any other change, including source).
-- Safe to re-run.
-- ============================================================================

alter table public.diesel_purchases add column if not exists destination text not null default 'main';
alter table public.diesel_purchases drop constraint if exists diesel_purchases_destination_check;
alter table public.diesel_purchases add constraint diesel_purchases_destination_check
  check (destination in ('main', 'direct'));

alter table public.diesel_distributions add column if not exists source text;
alter table public.diesel_distributions drop constraint if exists diesel_distributions_source_check;
alter table public.diesel_distributions add constraint diesel_distributions_source_check
  check (source is null or source in ('tanker', 'direct'));

-- Check after running (expect: main | <number of purchases>, and 0 deliveries with a source yet):
--   select destination, count(*) from public.diesel_purchases group by 1;
--   select count(*) from public.diesel_distributions where source is not null;
