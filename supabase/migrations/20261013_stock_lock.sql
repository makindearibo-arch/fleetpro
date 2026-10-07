-- ============================================================================
-- COUNTED DAYS ARE LOCKED (2026-10-07, Makinde).
-- ============================================================================
-- On 7 Oct a 420 L main-tank variance (books 30,420 L, counted 30,000 L on
-- 5 Oct) disappeared because deliveries dated BEFORE the count were edited
-- afterwards. A variance must only go away when the Super Admin decides so.
--
-- From now on, anything that changes a figure that has already been counted
-- can only be added, changed or deleted by the SUPER ADMIN (or the backend --
-- scripts / SQL editor, still recorded in the change history):
--   * main-tank purchases dated BEFORE the latest main-tank count (the main
--     tank is counted in the morning, so a purchase on the count's own day is
--     still open);
--   * tanker loadings / pour-backs dated before the latest main-tank count, or
--     on/before the latest tanker check (a tanker check is the end of its day);
--   * deliveries from the tanker dated on/before the latest tanker check, and
--     any delivery dated before tracking started (the first main-tank count) --
--     those set the opening stock;
--   * a recorded count itself (its litres or date; adding a photo or a note is
--     still fine), and adding a count dated before that tank's latest count.
-- Purchases and deliveries that go STRAIGHT TO STORES never touch the main tank
-- or the tanker and stay open. Store staff accepting a delivery is unaffected
-- (it changes no litres). Matches stockLock() in App.jsx. Safe to re-run.
-- ============================================================================

create or replace function public.fp_guard_stock_lock() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_first date; v_last_main date; v_last_tank date;
  v_old jsonb; v_new jsonb; v jsonb; d date; v_msg text;
  fmt constant text := 'FMDD Mon';
begin
  if public.fp_is_super() or public.fp_is_backend() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;

  -- an update that changes nothing the stock depends on is always fine (nested
  -- IFs: a NEW.field reference is only resolved for the table that has it)
  if tg_op = 'UPDATE' then
    if tg_table_name = 'diesel_distributions' then
      if (new.date, new.litres, new.source, new.store_location, new.purchase_id)
         is not distinct from (old.date, old.litres, old.source, old.store_location, old.purchase_id) then return new; end if;
    elsif tg_table_name = 'diesel_purchases' then
      if (new.date, new.litres, new.litres_received, new.destination)
         is not distinct from (old.date, old.litres, old.litres_received, old.destination) then return new; end if;
    elsif tg_table_name = 'tanker_loads' then
      if (new.date, new.litres, new.kind) is not distinct from (old.date, old.litres, old.kind) then return new; end if;
    elsif tg_table_name = 'diesel_stock_checks' then
      if (new.date, new.litres, new.tank) is not distinct from (old.date, old.litres, old.tank) then return new; end if;
    end if;
  end if;

  if tg_table_name = 'diesel_stock_checks' then
    if tg_op <> 'INSERT' then
      raise exception 'Locked: the % count for % is already recorded. Only the Super Admin can change or delete a count.',
        case when old.tank = 'main' then 'main tank' else 'tanker' end, to_char(old.date, fmt);
    end if;
    select max(date) into d from public.diesel_stock_checks where tank = new.tank;
    if d is not null and new.date < d then
      raise exception 'Locked: the % was already counted on %, after %. Only the Super Admin can add an earlier count.',
        case when new.tank = 'main' then 'main tank' else 'tanker' end, to_char(d, fmt), to_char(new.date, fmt);
    end if;
    return new;
  end if;

  select min(date), max(date) into v_first, v_last_main from public.diesel_stock_checks where tank = 'main';
  select max(date) into v_last_tank from public.diesel_stock_checks where tank = 'tanker';

  -- the old row (what is being changed or removed) and the new row both count
  foreach v in array array_remove(array[v_old, v_new], null) loop
    d := (v ->> 'date')::date;
    v_msg := null;
    if tg_table_name = 'diesel_purchases' then
      if coalesce(v ->> 'destination', 'main') <> 'direct' and v_last_main is not null and d < v_last_main then
        v_msg := format('Locked: the main tank was already counted on %s, after this purchase (%s). Only the Super Admin can change it now.',
                        to_char(v_last_main, fmt), to_char(d, fmt));
      end if;
    elsif tg_table_name = 'diesel_distributions' then
      if coalesce(v ->> 'source', 'tanker') <> 'direct' then
        if v_first is not null and d < v_first then
          v_msg := format('Locked: this delivery (%s) is from before stock tracking started on %s, so it sets the opening stock. Only the Super Admin can change it now.',
                          to_char(d, fmt), to_char(v_first, fmt));
        elsif v_last_tank is not null and d <= v_last_tank then
          v_msg := format('Locked: the tanker was already checked at the end of %s. Only the Super Admin can change deliveries up to that day.',
                          to_char(v_last_tank, fmt));
        end if;
      end if;
    elsif tg_table_name = 'tanker_loads' then
      if v_last_main is not null and d < v_last_main then
        v_msg := format('Locked: the main tank was already counted on %s, after this loading (%s). Only the Super Admin can change it now.',
                        to_char(v_last_main, fmt), to_char(d, fmt));
      elsif v_last_tank is not null and d <= v_last_tank then
        v_msg := format('Locked: the tanker was already checked at the end of %s. Only the Super Admin can change loadings up to that day.',
                        to_char(v_last_tank, fmt));
      end if;
    end if;
    if v_msg is not null then raise exception '%', v_msg; end if;
  end loop;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists fp_guard_stock_lock on public.diesel_purchases;
create trigger fp_guard_stock_lock before insert or update or delete on public.diesel_purchases
  for each row execute function public.fp_guard_stock_lock();
drop trigger if exists fp_guard_stock_lock on public.diesel_distributions;
create trigger fp_guard_stock_lock before insert or update or delete on public.diesel_distributions
  for each row execute function public.fp_guard_stock_lock();
drop trigger if exists fp_guard_stock_lock on public.tanker_loads;
create trigger fp_guard_stock_lock before insert or update or delete on public.tanker_loads
  for each row execute function public.fp_guard_stock_lock();
drop trigger if exists fp_guard_stock_lock on public.diesel_stock_checks;
create trigger fp_guard_stock_lock before insert or update or delete on public.diesel_stock_checks
  for each row execute function public.fp_guard_stock_lock();

-- Proof it took (expect one row: lock_triggers = 4):
select count(*) as lock_triggers from pg_trigger
 where tgname = 'fp_guard_stock_lock'
   and tgrelid in ('public.diesel_purchases'::regclass, 'public.diesel_distributions'::regclass,
                   'public.tanker_loads'::regclass, 'public.diesel_stock_checks'::regclass);
