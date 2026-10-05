-- ============================================================================
-- ACCESS RULES: enforce who can do what IN THE DATABASE, not just the browser.
-- ============================================================================
-- Until now every table had row-level security switched off
-- (20260512_disable_rls_all_public_tables.sql) and the app relied on the
-- browser hiding buttons. On 2026-10-05, with the app's public key and NO
-- login, it was possible to read purchases, deliveries and staff accounts and
-- to edit purchases, deliveries and user roles. Public sign-up is on with email
-- auto-confirm, so "must be logged in" is not enough on its own: anyone can make
-- a login in seconds. Access therefore requires a FleetPro PROFILE with a role,
-- and only a Super Admin can create profiles or change roles.
--
-- Who can do what after this:
--   Super Admin   everything; the only role that can add a stock reconciliation,
--                 create users, or change anyone's role or store
--   Fleet Manager everything else that is a manager's job (purchases, deliveries,
--                 fleet records, settings)
--   Store Staff   read; log readings, transfers and NEPA periods for THEIR store;
--                 ACCEPT their store's deliveries (nothing else on a delivery);
--                 update their own generator's hour meter; edit their own name
--   Viewer        read only
--   no profile    nothing (covers anonymous callers and stray sign-ups)
--   Your scripts (service-role key) and the SQL editor bypass the policies as
--   before; the triggers below recognise them as the "backend".
--
-- Stock reconciliations become PERMANENT: they can be added (Super Admin only)
-- but never edited or deleted. Correct one by recording a new stock take.
--
-- Safe to re-run. To undo everything: 20261005_access_rules_ROLLBACK.sql
-- ============================================================================

-- 0. Helpers ------------------------------------------------------------------
-- SECURITY DEFINER so a policy can look up the caller's profile without
-- recursing into the profiles table's own policies.
create or replace function public.fp_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.fp_store() returns text
language sql stable security definer set search_path = public as $$
  select store_location from public.profiles where id = auth.uid()
$$;

create or replace function public.fp_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fp_role() in ('Super Admin', 'Fleet Manager', 'Store Staff', 'Viewer'), false)
$$;

create or replace function public.fp_is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fp_role() in ('Super Admin', 'Fleet Manager'), false)
$$;

create or replace function public.fp_is_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fp_role() = 'Super Admin', false)
$$;

create or replace function public.fp_is_staff_of(store text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fp_role() = 'Store Staff' and store is not null and store = public.fp_store(), false)
$$;

-- The JWT role of the current request: 'anon', 'authenticated', 'service_role',
-- or NULL in the SQL editor.
create or replace function public.fp_jwt_role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
$$;

-- "Backend" = the service-role key (your scripts) or the SQL editor: no end user.
create or replace function public.fp_is_backend() returns boolean
language sql stable as $$
  select auth.uid() is null and coalesce(public.fp_jwt_role(), 'service_role') = 'service_role'
$$;

-- 1. Clean slate: drop every existing policy on public tables -----------------
-- Policies left over from earlier experiments sat inert while RLS was off;
-- switching RLS on would wake them up, and a permissive one would quietly undo
-- these rules. Dropping them all makes the result exactly what this file says.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- 2. Switch row-level security on, and let every FleetPro member read ---------
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename <> 'audit_log' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('create policy fp_member_read on public.%I for select to authenticated using ((select public.fp_is_member()))', r.tablename);
  end loop;
end $$;

-- 3. Managers (Super Admin + Fleet Manager) write everything except profiles ---
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings', 'diesel_distributions', 'diesel_locks', 'diesel_readings', 'diesel_transfers',
    'doc_types', 'drivers', 'fuel_logs', 'generator_baselines', 'generators', 'insp_items',
    'inspections', 'locations', 'nepa_period_logs', 'odo_log', 'papers', 'store_diesel_stock',
    'svc_reminders', 'vehicles', 'vendor_types', 'vendors', 'work_orders'
  ] loop
    execute format('create policy fp_manager_insert on public.%I for insert to authenticated with check ((select public.fp_is_manager()))', t);
    execute format('create policy fp_manager_update on public.%I for update to authenticated using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()))', t);
    execute format('create policy fp_manager_delete on public.%I for delete to authenticated using ((select public.fp_is_manager()))', t);
  end loop;
end $$;

-- Purchases: managers, but a STOCK RECONCILIATION row only by a Super Admin.
create policy fp_manager_insert on public.diesel_purchases for insert to authenticated
  with check ((select public.fp_is_manager())
              and (supplier is distinct from 'STOCK RECONCILIATION' or (select public.fp_is_super())));
create policy fp_manager_update on public.diesel_purchases for update to authenticated
  using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()));
create policy fp_manager_delete on public.diesel_purchases for delete to authenticated
  using ((select public.fp_is_manager()));

-- 4. Store staff: their own store only ----------------------------------------
create policy fp_staff_insert on public.diesel_readings for insert to authenticated
  with check (public.fp_is_staff_of(store_location));
create policy fp_staff_update on public.diesel_readings for update to authenticated
  using (public.fp_is_staff_of(store_location)) with check (public.fp_is_staff_of(store_location));

create policy fp_staff_insert on public.diesel_transfers for insert to authenticated
  with check (public.fp_is_staff_of(store_location));
create policy fp_staff_update on public.diesel_transfers for update to authenticated
  using (public.fp_is_staff_of(store_location)) with check (public.fp_is_staff_of(store_location));
create policy fp_staff_delete on public.diesel_transfers for delete to authenticated
  using (public.fp_is_staff_of(store_location));

create policy fp_staff_insert on public.nepa_period_logs for insert to authenticated
  with check (public.fp_is_staff_of(store_location));
create policy fp_staff_update on public.nepa_period_logs for update to authenticated
  using (public.fp_is_staff_of(store_location)) with check (public.fp_is_staff_of(store_location));
create policy fp_staff_delete on public.nepa_period_logs for delete to authenticated
  using (public.fp_is_staff_of(store_location));

-- Deliveries: staff may only ACCEPT one to their own store (trigger below
-- rejects any change other than the acceptance fields).
create policy fp_staff_accept on public.diesel_distributions for update to authenticated
  using (public.fp_is_staff_of(store_location)) with check (public.fp_is_staff_of(store_location));

-- Generators: staff update their own store's generator (trigger: hour meter only).
create policy fp_staff_update on public.generators for update to authenticated
  using (public.fp_is_staff_of(loc)) with check (public.fp_is_staff_of(loc));

-- Odometer/hour-meter log: staff only for a generator at their own store.
create policy fp_staff_insert on public.odo_log for insert to authenticated
  with check ((select public.fp_role()) = 'Store Staff'
              and exists (select 1 from public.generators g where g.id = odo_log.asset and g.loc = (select public.fp_store())));

-- 5. Profiles: only a Super Admin creates users or changes roles/stores --------
create policy fp_profile_insert on public.profiles for insert to authenticated
  with check ((select public.fp_is_super()));
create policy fp_profile_update_super on public.profiles for update to authenticated
  using ((select public.fp_is_super())) with check ((select public.fp_is_super()));
create policy fp_profile_update_self on public.profiles for update to authenticated
  using (id = auth.uid() and (select public.fp_is_member())) with check (id = auth.uid());
create policy fp_profile_delete on public.profiles for delete to authenticated
  using ((select public.fp_is_super()));

-- 6. Guards that policies cannot express (column-level rules) -----------------
create or replace function public.fp_guard_reconciliation() returns trigger
language plpgsql as $$
begin
  if public.fp_is_backend() then return coalesce(new, old); end if;
  if tg_op in ('UPDATE', 'DELETE') and old.supplier = 'STOCK RECONCILIATION' then
    raise exception 'Stock reconciliations are permanent and cannot be edited or deleted. To correct one, record a new stock take.'
      using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.supplier = 'STOCK RECONCILIATION' then
    raise exception 'A purchase cannot be turned into a stock reconciliation.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists fp_guard_reconciliation on public.diesel_purchases;
create trigger fp_guard_reconciliation before update or delete on public.diesel_purchases
  for each row execute function public.fp_guard_reconciliation();

create or replace function public.fp_guard_distribution() returns trigger
language plpgsql as $$
begin
  if public.fp_is_backend() or public.fp_is_manager() then return new; end if;
  if (to_jsonb(new) - array['received_confirmed', 'received_date', 'received_by'])
     is distinct from (to_jsonb(old) - array['received_confirmed', 'received_date', 'received_by']) then
    raise exception 'Store staff can accept a delivery but not change it.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists fp_guard_distribution on public.diesel_distributions;
create trigger fp_guard_distribution before update on public.diesel_distributions
  for each row execute function public.fp_guard_distribution();

create or replace function public.fp_guard_generator() returns trigger
language plpgsql as $$
begin
  if public.fp_is_backend() or public.fp_is_manager() then return new; end if;
  if (to_jsonb(new) - 'hrs') is distinct from (to_jsonb(old) - 'hrs') then
    raise exception 'Store staff can update the hour meter only.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists fp_guard_generator on public.generators;
create trigger fp_guard_generator before update on public.generators
  for each row execute function public.fp_guard_generator();

create or replace function public.fp_guard_profile() returns trigger
language plpgsql as $$
begin
  if public.fp_is_backend() or public.fp_is_super() then return new; end if;
  if new.id is distinct from old.id or new.role is distinct from old.role
     or new.store_location is distinct from old.store_location or new.email is distinct from old.email then
    raise exception 'Only a Super Admin can change roles, stores or email addresses.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists fp_guard_profile on public.profiles;
create trigger fp_guard_profile before update on public.profiles
  for each row execute function public.fp_guard_profile();

-- 7. File storage: members only (a stray sign-up is "authenticated" too) -------
drop policy if exists "documents_authenticated_all" on storage.objects;
drop policy if exists "documents_members_all" on storage.objects;
create policy "documents_members_all" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (select public.fp_is_member()))
  with check (bucket_id = 'documents' and (select public.fp_is_member()));

drop policy if exists "meter_photos_authenticated_all" on storage.objects;
drop policy if exists "meter_photos_members_all" on storage.objects;
create policy "meter_photos_members_all" on storage.objects for all to authenticated
  using (bucket_id = 'meter-photos' and (select public.fp_is_member()))
  with check (bucket_id = 'meter-photos' and (select public.fp_is_member()));

-- Check after running (should list 24 tables, all true):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
