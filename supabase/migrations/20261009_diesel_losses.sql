-- ============================================================================
-- ACCEPTED DIESEL LOSSES: the only way a shortfall leaves the books.
-- ============================================================================
-- The main tank's "books" come from the purchases: diesel bought into the tank
-- minus what has been delivered. When a count finds less (e.g. counted 30,000,
-- books 30,420), the 420 L show as MISSING on the purchase whose diesel was in
-- the tank, in red, every day -- until either the count is corrected (it was a
-- misreading) or the Super Admin accepts the loss here, with a reason. An
-- accepted loss takes the litres off the books for good and the purchase then
-- shows it in amber with the reason.
--
-- Only the Super Admin can record, change or undo an accepted loss; every
-- FleetPro member can read them; every change is in the change history.
-- (The old "Reconcile Stock" button, which silently reset the books to a
-- count, is removed from the app.)
--
-- Safe to re-run. Needs 20261005_access_rules.sql and 20261005_change_history.sql.
-- ============================================================================

create table if not exists public.diesel_losses (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.diesel_purchases (id) on delete restrict,
  date        date not null,
  location    text not null check (location in ('main', 'tanker')),
  litres      numeric not null check (litres > 0),
  reason      text not null check (length(btrim(reason)) >= 3),
  recorded_by uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists diesel_losses_purchase_idx on public.diesel_losses (purchase_id);

alter table public.diesel_losses enable row level security;
drop policy if exists fp_member_read on public.diesel_losses;
drop policy if exists fp_super_insert on public.diesel_losses;
drop policy if exists fp_super_update on public.diesel_losses;
drop policy if exists fp_super_delete on public.diesel_losses;
create policy fp_member_read on public.diesel_losses for select to authenticated
  using ((select public.fp_is_member()));
create policy fp_super_insert on public.diesel_losses for insert to authenticated
  with check ((select public.fp_is_super()));
create policy fp_super_update on public.diesel_losses for update to authenticated
  using ((select public.fp_is_super())) with check ((select public.fp_is_super()));
create policy fp_super_delete on public.diesel_losses for delete to authenticated
  using ((select public.fp_is_super()));

grant select, insert, update, delete on public.diesel_losses to authenticated;
revoke all on public.diesel_losses from anon;

drop trigger if exists fp_audit on public.diesel_losses;
create trigger fp_audit after insert or update or delete on public.diesel_losses
  for each row execute function public.fp_audit();

-- Check after running (expect: true, 4, 1):
--   select (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'diesel_losses'),
--          (select count(*) from pg_policies where tablename = 'diesel_losses'),
--          (select count(*) from pg_trigger where tgname = 'fp_audit' and tgrelid = 'public.diesel_losses'::regclass);
