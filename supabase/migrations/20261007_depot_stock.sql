-- ============================================================================
-- DAILY STOCK: the main diesel tank and the distribution tanker.
-- ============================================================================
-- Diesel moves main tank -> distribution tanker -> store tanks. Until now the
-- app only recorded "delivered to store", so diesel left in the tanker after a
-- trip looked like a main-tank loss, and the main tank itself was never
-- checked (one stock take ever, 15 Jun 2026).
--
-- diesel_stock_checks  a physical reading of the main tank's gauge (every
--                      morning, before any loading) or of the tanker, in litres.
--                      One per tank per day.
-- tanker_loads         diesel moved from the main tank into the tanker
--                      (kind 'load'), or poured back from the tanker into the
--                      main tank (kind 'return').
--
-- With these the app can check, every day:
--   main tank  yesterday's reading + bought - loaded + returned = this morning
--   tanker     loaded - returned - delivered to stores = what is left in it
--
-- Recorded by fleet admins only (Super Admin, Fleet Manager); every FleetPro
-- member can read. Every change goes into the change history (fp_audit).
--
-- Safe to re-run. Needs 20261005_access_rules.sql and 20261005_change_history.sql.
-- ============================================================================

create table if not exists public.diesel_stock_checks (
  id          uuid primary key default gen_random_uuid(),
  tank        text not null check (tank in ('main', 'tanker')),
  date        date not null,
  litres      numeric not null check (litres >= 0),
  photo_url   text,
  notes       text,
  recorded_by uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint diesel_stock_checks_one_per_day unique (tank, date)
);

create table if not exists public.tanker_loads (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  kind        text not null default 'load' check (kind in ('load', 'return')),
  litres      numeric not null check (litres > 0),
  notes       text,
  recorded_by uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists tanker_loads_date_idx on public.tanker_loads (date);

do $$
declare t text;
begin
  foreach t in array array['diesel_stock_checks', 'tanker_loads'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists fp_member_read on public.%I', t);
    execute format('drop policy if exists fp_manager_insert on public.%I', t);
    execute format('drop policy if exists fp_manager_update on public.%I', t);
    execute format('drop policy if exists fp_manager_delete on public.%I', t);
    execute format('create policy fp_member_read on public.%I for select to authenticated using ((select public.fp_is_member()))', t);
    execute format('create policy fp_manager_insert on public.%I for insert to authenticated with check ((select public.fp_is_manager()))', t);
    execute format('create policy fp_manager_update on public.%I for update to authenticated using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()))', t);
    execute format('create policy fp_manager_delete on public.%I for delete to authenticated using ((select public.fp_is_manager()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop trigger if exists fp_audit on public.%I', t);
    execute format('create trigger fp_audit after insert or update or delete on public.%I for each row execute function public.fp_audit()', t);
  end loop;
end $$;

-- Check after running (expect: 2, 8, 2):
--   select (select count(*) from pg_tables where schemaname = 'public' and tablename in ('diesel_stock_checks','tanker_loads') and rowsecurity),
--          (select count(*) from pg_policies where tablename in ('diesel_stock_checks','tanker_loads')),
--          (select count(*) from pg_trigger where tgname = 'fp_audit' and tgrelid in ('public.diesel_stock_checks'::regclass, 'public.tanker_loads'::regclass));
