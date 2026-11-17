-- ============================================================================
-- NEPA (PHCN) SUPPLY HOURS PER STORE PER DAY (2026-11-17).
-- ============================================================================
-- Makinde: cross-check when NEPA (PHCN) gave the stores power against when the
-- generators ran. Internal Control's "PHCN ANALYSIS" sheet has, per store and
-- day, the hours PHCN says it supplied (the distribution company's feeder
-- figures). Those hours are typed or pasted in Diesel Management -> NEPA supply
-- and the Reports tab "NEPA vs Generator" sets them beside the hours the store
-- recorded itself and its generator hours: a day can only hold 24 hours, so
-- PHCN hours + generator hours over 24 means the generator ran while PHCN says
-- power was on.
--
--   nepa_supply   store_location, date, hours (0-24, what PHCN supplied), notes
--   one row per store per day (saving again updates it).
-- Members read; managers (Super Admin, Fleet Manager) write; every change goes
-- into the change history. Safe to re-run.
-- ============================================================================

create table if not exists public.nepa_supply (
  id             uuid primary key default gen_random_uuid(),
  store_location text not null,
  date           date not null,
  hours          numeric not null check (hours >= 0 and hours <= 24),
  notes          text,
  recorded_by    uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint nepa_supply_one_per_store_per_day unique (store_location, date)
);

alter table public.nepa_supply enable row level security;
drop policy if exists fp_member_read on public.nepa_supply;
drop policy if exists fp_manager_insert on public.nepa_supply;
drop policy if exists fp_manager_update on public.nepa_supply;
drop policy if exists fp_manager_delete on public.nepa_supply;
create policy fp_member_read on public.nepa_supply for select to authenticated using ((select public.fp_is_member()));
create policy fp_manager_insert on public.nepa_supply for insert to authenticated with check ((select public.fp_is_manager()));
create policy fp_manager_update on public.nepa_supply for update to authenticated using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()));
create policy fp_manager_delete on public.nepa_supply for delete to authenticated using ((select public.fp_is_manager()));
grant select, insert, update, delete on public.nepa_supply to authenticated;
grant select, insert, update, delete on public.nepa_supply to service_role;   -- scripts (explicit, not left to default privileges)
revoke all on public.nepa_supply from anon;

drop trigger if exists fp_audit on public.nepa_supply;
create trigger fp_audit after insert or update or delete on public.nepa_supply
  for each row execute function public.fp_audit();

-- Proof it took (expect one row: 4 | 1):
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'nepa_supply') as count_rules,
       (select count(*) from pg_trigger where tgname = 'fp_audit' and tgrelid = 'public.nepa_supply'::regclass) as history_trigger;
