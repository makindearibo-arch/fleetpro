-- ============================================================================
-- COOKING GAS STOCK COUNTS AT THE MAIN OFFICE (2026-10-20).
-- ============================================================================
-- Makinde: the gas page must work like an inventory system -- a stock card per
-- cylinder size where each day's opening is the previous day's closing. The
-- opening stock is entered ONCE (a gas_purchases row with supplier OPENING
-- STOCK); after that, whenever someone checks what is at the main office they
-- record a COUNT: the number of full cylinders of each size there at the time
-- of the check (after that day's sends). The count becomes that day's closing,
-- the difference from the books is the variance, and the next day opens from
-- the count. (The fleet manager had been entering "opening stock" again from
-- his book on later days, which the app added as extra cylinders.)
--
--   gas_stock_counts   date, kg_each, cylinders (full ones counted), notes
--   one count per size per day (a second count that day replaces it).
-- Members read; managers write; every change goes into the change history.
-- Safe to re-run.
-- ============================================================================

create table if not exists public.gas_stock_counts (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  kg_each     numeric not null check (kg_each > 0),
  cylinders   integer not null check (cylinders >= 0),
  notes       text,
  recorded_by uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint gas_stock_counts_one_per_size_per_day unique (date, kg_each)
);

alter table public.gas_stock_counts enable row level security;
drop policy if exists fp_member_read on public.gas_stock_counts;
drop policy if exists fp_manager_insert on public.gas_stock_counts;
drop policy if exists fp_manager_update on public.gas_stock_counts;
drop policy if exists fp_manager_delete on public.gas_stock_counts;
create policy fp_member_read on public.gas_stock_counts for select to authenticated using ((select public.fp_is_member()));
create policy fp_manager_insert on public.gas_stock_counts for insert to authenticated with check ((select public.fp_is_manager()));
create policy fp_manager_update on public.gas_stock_counts for update to authenticated using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()));
create policy fp_manager_delete on public.gas_stock_counts for delete to authenticated using ((select public.fp_is_manager()));
grant select, insert, update, delete on public.gas_stock_counts to authenticated;
revoke all on public.gas_stock_counts from anon;

drop trigger if exists fp_audit on public.gas_stock_counts;
create trigger fp_audit after insert or update or delete on public.gas_stock_counts
  for each row execute function public.fp_audit();

-- Proof it took (expect one row: 4 | 1):
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'gas_stock_counts') as count_rules,
       (select count(*) from pg_trigger where tgname = 'fp_audit' and tgrelid = 'public.gas_stock_counts'::regclass) as history_trigger;
