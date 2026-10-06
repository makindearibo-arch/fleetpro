-- ============================================================================
-- STORE TRANSFERS: the receiving store says which tank the diesel went into.
-- ============================================================================
-- At a store with more than one tank in use (Ondo / Owo / Oye Bakery: a
-- generator and an oven), diesel sent from another store can go into either.
-- When the receiving store accepts, it now records the tank (dest_id); the app
-- then counts the litres on that tank's reading. Stores with one tank in use
-- are not asked anything.
--
-- Replaces fp_guard_transfer (20261010_store_transfers.sql). Same rules as
-- before, plus: the receiving store may set dest_id ONLY together with
-- accepting, and only to a tank (generators row) at the receiving store.
-- Managers and the backend remain exempt. Safe to re-run.
-- ============================================================================

create or replace function public.fp_guard_transfer() returns trigger
language plpgsql as $$
declare
  recv text[] := array['received_confirmed', 'received_date', 'received_by'];
  recv_changed boolean;
  dest_changed boolean;
  rest_changed boolean;
  is_receiver boolean;
  is_sender boolean;
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
  dest_changed := new.dest_id is distinct from old.dest_id;
  rest_changed := (to_jsonb(new) - recv - 'dest_id') is distinct from (to_jsonb(old) - recv - 'dest_id');
  is_receiver := new.dest_type = 'store' and public.fp_is_staff_of(new.dest_store);
  is_sender := public.fp_is_staff_of(old.store_location);
  if old.received_confirmed and (rest_changed or dest_changed) then
    raise exception 'This transfer has been accepted by the receiving store - ask a manager to change it.' using errcode = '42501';
  end if;
  if rest_changed and not is_sender then
    raise exception 'Only the sending store can change a transfer.' using errcode = '42501';
  end if;
  if recv_changed then
    if not is_receiver then
      raise exception 'Only the receiving store can accept a transfer.' using errcode = '42501';
    end if;
    if rest_changed then
      raise exception 'Accept a transfer without changing it.' using errcode = '42501';
    end if;
  end if;
  if dest_changed and not is_sender and not (is_receiver and recv_changed and new.received_confirmed) then
    raise exception 'The receiving store can only choose the tank when accepting the transfer.' using errcode = '42501';
  end if;
  if dest_changed and new.dest_type = 'store' and new.dest_id is not null
     and not exists (select 1 from public.generators g where g.id = new.dest_id and g.loc = new.dest_store) then
    raise exception 'That tank is not at %.', new.dest_store using errcode = '42501';
  end if;
  return new;
end $$;

-- (the trigger from 20261010 already calls this function; recreate it in case)
drop trigger if exists fp_guard_transfer on public.diesel_transfers;
create trigger fp_guard_transfer before insert or update or delete on public.diesel_transfers
  for each row execute function public.fp_guard_transfer();
