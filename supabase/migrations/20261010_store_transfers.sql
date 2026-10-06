-- ============================================================================
-- DIESEL MOVED BETWEEN STORES (e.g. Ado 1 -> Ado Bakery).
-- ============================================================================
-- A transfer could already go to a vehicle, an oven or "other"; now it can go
-- to ANOTHER STORE (dest_type 'store', dest_store = the receiving store). The
-- sending store's tank goes down (moved out, not used). The RECEIVING store
-- accepts it like an admin delivery -- only then does it count as diesel
-- received there (added to that day's reading).
--
-- Rules (trigger fp_guard_transfer; managers and the backend are exempt):
--   * only the RECEIVING store's staff can accept (received_* fields), and
--     accepting cannot change anything else
--   * the sending store cannot mark its own transfer accepted
--   * once accepted, only a manager can change or delete the transfer
--
-- Every change is already in the change history (fp_audit on diesel_transfers).
-- Safe to re-run. Needs 20261005_access_rules.sql.
-- ============================================================================

alter table public.diesel_transfers add column if not exists dest_store text;
alter table public.diesel_transfers add column if not exists received_confirmed boolean not null default false;
alter table public.diesel_transfers add column if not exists received_date date;
alter table public.diesel_transfers add column if not exists received_by uuid;
create index if not exists diesel_transfers_dest_store_idx on public.diesel_transfers (dest_store, date) where dest_store is not null;

-- the receiving store's staff may update (= accept) a transfer sent to them
drop policy if exists fp_staff_accept on public.diesel_transfers;
create policy fp_staff_accept on public.diesel_transfers for update to authenticated
  using (dest_type = 'store' and public.fp_is_staff_of(dest_store))
  with check (dest_type = 'store' and public.fp_is_staff_of(dest_store));

create or replace function public.fp_guard_transfer() returns trigger
language plpgsql as $$
declare
  recv text[] := array['received_confirmed', 'received_date', 'received_by'];
  recv_changed boolean;
  rest_changed boolean;
begin
  if public.fp_is_backend() or public.fp_is_manager() then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    if new.received_confirmed then
      raise exception 'A new transfer cannot be marked as accepted - the receiving store accepts it.' using errcode = '42501';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.received_confirmed then
      raise exception 'This transfer has been accepted by the receiving store - ask a manager to change it.' using errcode = '42501';
    end if;
    return old;
  end if;
  recv_changed := new.received_confirmed is distinct from old.received_confirmed
               or new.received_date is distinct from old.received_date
               or new.received_by is distinct from old.received_by;
  rest_changed := (to_jsonb(new) - recv) is distinct from (to_jsonb(old) - recv);
  if rest_changed then
    if old.received_confirmed then
      raise exception 'This transfer has been accepted by the receiving store - ask a manager to change it.' using errcode = '42501';
    end if;
    if not public.fp_is_staff_of(old.store_location) then
      raise exception 'Only the sending store can change a transfer.' using errcode = '42501';
    end if;
  end if;
  if recv_changed then
    if not (new.dest_type = 'store' and public.fp_is_staff_of(new.dest_store)) then
      raise exception 'Only the receiving store can accept a transfer.' using errcode = '42501';
    end if;
    if rest_changed then
      raise exception 'Accept a transfer without changing it.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists fp_guard_transfer on public.diesel_transfers;
create trigger fp_guard_transfer before insert or update or delete on public.diesel_transfers
  for each row execute function public.fp_guard_transfer();

-- Check after running (expect: 4 new columns, 1 trigger, 1 accept policy):
--   select (select count(*) from information_schema.columns where table_name = 'diesel_transfers' and column_name in ('dest_store','received_confirmed','received_date','received_by')),
--          (select count(*) from pg_trigger where tgname = 'fp_guard_transfer'),
--          (select count(*) from pg_policies where tablename = 'diesel_transfers' and policyname = 'fp_staff_accept');
