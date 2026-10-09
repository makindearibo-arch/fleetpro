-- ============================================================================
-- COOKING GAS COMES IN THROUGH THE FLEET MANAGER, LIKE DIESEL (2026-10-09).
-- ============================================================================
-- Makinde: only the fleet manager brings gas in. The fleet manager records a
-- gas PURCHASE (cylinders x kg, total cost), then SENDS cylinders to stores; a
-- store ACCEPTS what it was sent and then fixes / finishes it as before. Stores
-- can no longer add cylinders themselves. No store-to-store moves, no tracking
-- of empties, and the depot's gas = bought minus sent (no counts).
--
--   gas_purchases            date, supplier, cylinders, kg_each, cost (total)
--   gas_cylinders.purchase_id         the purchase a sent cylinder came from
--   gas_cylinders.received_confirmed  false until the store accepts it
--   gas_cylinders.received_date / received_by
-- A sent cylinder's purchase_date is the day it was SENT to the store.
-- Cylinders the stores recorded before today count as received.
--
-- Rules: members read; managers write; Store Staff may only update their own
-- store's cylinders -- accept them, set fixed / finished dates and notes -- and
-- may not fix one they have not accepted. A purchase can never have more
-- cylinders sent than were bought. Every change goes into the change history.
-- Safe to re-run.
-- ============================================================================

create table if not exists public.gas_purchases (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  supplier    text not null default '',
  cylinders   integer not null check (cylinders > 0),
  kg_each     numeric not null check (kg_each > 0),
  cost        numeric check (cost is null or cost >= 0),   -- total paid for the purchase (NGN)
  notes       text,
  recorded_by uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists gas_purchases_date_idx on public.gas_purchases (date);

alter table public.gas_purchases enable row level security;
drop policy if exists fp_member_read on public.gas_purchases;
drop policy if exists fp_manager_insert on public.gas_purchases;
drop policy if exists fp_manager_update on public.gas_purchases;
drop policy if exists fp_manager_delete on public.gas_purchases;
create policy fp_member_read on public.gas_purchases for select to authenticated using ((select public.fp_is_member()));
create policy fp_manager_insert on public.gas_purchases for insert to authenticated with check ((select public.fp_is_manager()));
create policy fp_manager_update on public.gas_purchases for update to authenticated using ((select public.fp_is_manager())) with check ((select public.fp_is_manager()));
create policy fp_manager_delete on public.gas_purchases for delete to authenticated using ((select public.fp_is_manager()));
grant select, insert, update, delete on public.gas_purchases to authenticated;
revoke all on public.gas_purchases from anon;
drop trigger if exists fp_audit on public.gas_purchases;
create trigger fp_audit after insert or update or delete on public.gas_purchases
  for each row execute function public.fp_audit();

-- cylinders: where they came from + acceptance. Existing rows (recorded by the
-- stores themselves) are already at the store, so they count as received; new
-- rows start unaccepted.
alter table public.gas_cylinders add column if not exists purchase_id uuid references public.gas_purchases(id) on delete restrict;
alter table public.gas_cylinders add column if not exists received_confirmed boolean not null default true;
alter table public.gas_cylinders alter column received_confirmed set default false;
alter table public.gas_cylinders add column if not exists received_date date;
alter table public.gas_cylinders add column if not exists received_by uuid;
create index if not exists gas_cylinders_purchase_idx on public.gas_cylinders (purchase_id);

-- stores no longer add or delete cylinders (only accept / fix / finish their own)
drop policy if exists fp_staff_insert on public.gas_cylinders;
drop policy if exists fp_staff_delete on public.gas_cylinders;

create or replace function public.fp_guard_gas() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_bought int; v_sent int;
begin
  if public.fp_is_backend() then return case when tg_op = 'DELETE' then old else new end; end if;
  if tg_op = 'DELETE' then return old; end if;   -- who may delete is the policies' job (managers only)

  -- never send more cylinders from a purchase than were bought
  if new.purchase_id is not null and (tg_op = 'INSERT' or new.purchase_id is distinct from old.purchase_id) then
    select cylinders into v_bought from public.gas_purchases where id = new.purchase_id;
    select count(*) into v_sent from public.gas_cylinders where purchase_id = new.purchase_id and id <> new.id;
    if v_bought is not null and v_sent >= v_bought then
      raise exception 'That gas purchase has no cylinders left to send (% bought, all sent).', v_bought;
    end if;
  end if;
  if public.fp_is_manager() then return new; end if;

  -- store staff: the policies already limit them to updating their own store's cylinders
  if tg_op = 'UPDATE' then
    if (new.store_location, new.purchase_date, new.kg, new.cost, new.purchase_id)
       is distinct from (old.store_location, old.purchase_date, old.kg, old.cost, old.purchase_id) then
      raise exception 'Only the fleet manager can change which store a cylinder went to, its size, cost or date sent.';
    end if;
    if old.received_confirmed and not new.received_confirmed then
      raise exception 'A cylinder that was accepted cannot be un-accepted.';
    end if;
    if new.received_confirmed and not old.received_confirmed then
      new.received_by := auth.uid();
      new.received_date := coalesce(new.received_date, (now() at time zone 'Africa/Lagos')::date);
    elsif (new.received_date, new.received_by) is distinct from (old.received_date, old.received_by) then
      raise exception 'Who received a cylinder is set when it is accepted.';
    end if;
  end if;
  if new.fixed_date is not null and not new.received_confirmed then
    raise exception 'Accept this cylinder first - it was sent to the store but has not been accepted yet.';
  end if;
  return new;
end $$;

drop trigger if exists fp_guard_gas on public.gas_cylinders;
create trigger fp_guard_gas before insert or update or delete on public.gas_cylinders
  for each row execute function public.fp_guard_gas();

-- Proof it took (expect one row: 4 | 5 | 3):
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'gas_purchases') as purchase_rules,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'gas_cylinders') as cylinder_rules,
       (select count(*) from pg_trigger where (tgname = 'fp_guard_gas' and tgrelid = 'public.gas_cylinders'::regclass)
                                          or (tgname = 'fp_audit' and tgrelid in ('public.gas_cylinders'::regclass, 'public.gas_purchases'::regclass))) as triggers;
