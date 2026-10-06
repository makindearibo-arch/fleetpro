-- ============================================================================
-- COOKING GAS: one row per gas cylinder at a store.
-- ============================================================================
-- Gas cannot be measured until a cylinder runs out, so each cylinder is
-- tracked: bought (purchase_date, kg, optional cost) -> fixed (fixed_date, it
-- started being used) -> finished (finished_date, it ran out). A cylinder with
-- no fixed_date is a spare in stock; fixed but not finished = in use. The app
-- works out how long each one lasted and each store's usual rate, and flags a
-- cylinder that ran out much faster than usual.
--
-- Access follows 20261005_access_rules.sql: every member reads; managers write
-- any store; Store Staff add / change / delete their OWN store's cylinders.
-- Every change goes into the change history. Safe to re-run.
-- ============================================================================

create table if not exists public.gas_cylinders (
  id             uuid primary key default gen_random_uuid(),
  store_location text not null,
  purchase_date  date not null,
  kg             numeric not null check (kg > 0),
  cost           numeric check (cost is null or cost >= 0),
  fixed_date     date,
  finished_date  date,
  notes          text,
  recorded_by    uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint gas_fixed_not_before_purchase check (fixed_date is null or fixed_date >= purchase_date),
  constraint gas_finished_after_fixed check (finished_date is null or (fixed_date is not null and finished_date >= fixed_date))
);
create index if not exists gas_cylinders_store_idx on public.gas_cylinders (store_location, purchase_date);

alter table public.gas_cylinders enable row level security;
drop policy if exists fp_member_read on public.gas_cylinders;
drop policy if exists fp_manager_insert on public.gas_cylinders;
drop policy if exists fp_manager_update on public.gas_cylinders;
drop policy if exists fp_manager_delete on public.gas_cylinders;
drop policy if exists fp_staff_insert on public.gas_cylinders;
drop policy if exists fp_staff_update on public.gas_cylinders;
drop policy if exists fp_staff_delete on public.gas_cylinders;
create policy fp_member_read on public.gas_cylinders for select to authenticated using ((select public.fp_is_member()));
create policy fp_manager_insert on public.gas_cylinders for insert to authenticated with check ((select public.fp_is_manager()));
create policy fp_manager_update on public.gas_cylinders for update to authenticated using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()));
create policy fp_manager_delete on public.gas_cylinders for delete to authenticated using ((select public.fp_is_manager()));
create policy fp_staff_insert on public.gas_cylinders for insert to authenticated with check (public.fp_is_staff_of(store_location));
create policy fp_staff_update on public.gas_cylinders for update to authenticated using (public.fp_is_staff_of(store_location)) with check (public.fp_is_staff_of(store_location));
create policy fp_staff_delete on public.gas_cylinders for delete to authenticated using (public.fp_is_staff_of(store_location));

grant select, insert, update, delete on public.gas_cylinders to authenticated;
revoke all on public.gas_cylinders from anon;

drop trigger if exists fp_audit on public.gas_cylinders;
create trigger fp_audit after insert or update or delete on public.gas_cylinders
  for each row execute function public.fp_audit();

-- Check after running (expect: true, 7, 1):
--   select (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'gas_cylinders'),
--          (select count(*) from pg_policies where tablename = 'gas_cylinders'),
--          (select count(*) from pg_trigger where tgname = 'fp_audit' and tgrelid = 'public.gas_cylinders'::regclass);
