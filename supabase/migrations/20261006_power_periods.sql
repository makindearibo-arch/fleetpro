-- ============================================================================
-- POWER ON/OFF LOG: when grid (NEPA) power came on and went off at each store.
-- ============================================================================
-- Staff tap "Power came ON" / "Power went OFF" in Diesel Log -> Power (NEPA)
-- as it happens (the time can be adjusted). The app adds up the hours of power
-- per day from these periods; the daily meter reading (nepa_period_logs) and
-- the diesel reading's nepa_hours take their hours from here.
--
-- A period that is still running has off_at NULL. At most ONE open period per
-- store (unique index below), so two phones tapping "Power came ON" at the same
-- time cannot create two.
--
-- Access follows 20261005_access_rules.sql: members read; managers write any
-- store; Store Staff add, change and delete only their own store's periods.
-- Every change is recorded in the change history (fp_audit).
--
-- Safe to re-run. Needs 20261005_access_rules.sql and 20261005_change_history.sql.
-- ============================================================================

create table if not exists public.power_periods (
  id             uuid primary key default gen_random_uuid(),
  store_location text not null,
  on_at          timestamptz not null,
  off_at         timestamptz,
  notes          text,
  recorded_by    uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint power_periods_off_after_on check (off_at is null or off_at > on_at)
);

create index if not exists power_periods_store_on_idx on public.power_periods (store_location, on_at desc);
create unique index if not exists power_periods_one_open_per_store on public.power_periods (store_location) where off_at is null;

alter table public.power_periods enable row level security;

drop policy if exists fp_member_read on public.power_periods;
drop policy if exists fp_manager_insert on public.power_periods;
drop policy if exists fp_manager_update on public.power_periods;
drop policy if exists fp_manager_delete on public.power_periods;
drop policy if exists fp_staff_insert on public.power_periods;
drop policy if exists fp_staff_update on public.power_periods;
drop policy if exists fp_staff_delete on public.power_periods;

create policy fp_member_read on public.power_periods for select to authenticated
  using ((select public.fp_is_member()));
create policy fp_manager_insert on public.power_periods for insert to authenticated
  with check ((select public.fp_is_manager()));
create policy fp_manager_update on public.power_periods for update to authenticated
  using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()));
create policy fp_manager_delete on public.power_periods for delete to authenticated
  using ((select public.fp_is_manager()));
create policy fp_staff_insert on public.power_periods for insert to authenticated
  with check (public.fp_is_staff_of(store_location));
create policy fp_staff_update on public.power_periods for update to authenticated
  using (public.fp_is_staff_of(store_location)) with check (public.fp_is_staff_of(store_location));
create policy fp_staff_delete on public.power_periods for delete to authenticated
  using (public.fp_is_staff_of(store_location));

grant select, insert, update, delete on public.power_periods to authenticated;
revoke all on public.power_periods from anon;

drop trigger if exists fp_audit on public.power_periods;
create trigger fp_audit after insert or update or delete on public.power_periods
  for each row execute function public.fp_audit();

-- Check after running (expect: true, 7, 1):
--   select (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'power_periods'),
--          (select count(*) from pg_policies where tablename = 'power_periods'),
--          (select count(*) from pg_trigger where tgname = 'fp_audit' and tgrelid = 'public.power_periods'::regclass);
