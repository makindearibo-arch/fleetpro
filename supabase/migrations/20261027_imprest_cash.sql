-- =============================================================================
-- IMPREST: CASH FIRST, SPENDING LOGGED, APPROVED AT THE END OF THE WEEK (2026-10-27).
-- =============================================================================
-- Makinde: in practice the fleet office COLLECTS cash first (e.g. N30,000 for the
-- week, plus any extra during the week), logs each expense as a line as it happens,
-- and submits the week's voucher at the end of the week for Audit -> HQ Accounts ->
-- Senior Manager to check. Only the Super Admin and HQ Accounts record cash.
--
--   imprest_cash      one row per collection: week_start (Monday), date, amount,
--                     kind weekly|extra, note. Super Admin / HQ Accounts only;
--                     fixed once that week's voucher is approved.
--   imprest_vouchers  + collected_total, closing_balance (fixed at final approval)
--
-- Money for a week:  opening (= last approved week's closing, if positive)
--                    + cash collected - approved spending = closing (carried on).
-- A negative closing is OWED to the fleet office: the next weekly voucher carries
-- one 'owed' line for exactly that amount, which the approvers check
-- (20261027_imprest_owed.sql). Lines lowered by an approver count as cash the
-- fleet office still holds. "Retire", "spent" and "paid out" are no longer used.
--
-- Replaces fp_imprest_carry and fp_guard_imprest. Safe to re-run.
-- =============================================================================

-- 1. Cash collected ----------------------------------------------------------
create table if not exists public.imprest_cash (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null check (extract(isodow from week_start) = 1),
  date        date not null,
  amount      numeric not null check (amount > 0),
  kind        text not null default 'weekly' check (kind in ('weekly', 'extra')),
  note        text,
  recorded_by uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists imprest_cash_week_idx on public.imprest_cash (week_start);

create or replace function public.fp_imprest_cash_role() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fp_role() in ('Super Admin', 'HQ Accounts'), false)
$$;

create or replace function public.fp_guard_imprest_cash() returns trigger
language plpgsql as $$
begin
  if public.fp_is_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and exists (select 1 from public.imprest_vouchers v
      where v.kind = 'weekly' and v.status = 'approved' and v.week_start = old.week_start) then
    raise exception 'The week of % is already approved - its cash is fixed. Record it in the current week.', to_char(old.week_start, 'DD Mon');
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if exists (select 1 from public.imprest_vouchers v
      where v.kind = 'weekly' and v.status = 'approved' and v.week_start = new.week_start) then
    raise exception 'The week of % is already approved - its cash is fixed. Record it in the current week.', to_char(new.week_start, 'DD Mon');
  end if;
  if tg_op = 'INSERT' then
    new.recorded_by := auth.uid(); new.created_at := now();
  else
    new.recorded_by := old.recorded_by; new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists fp_guard_imprest_cash on public.imprest_cash;
create trigger fp_guard_imprest_cash before insert or update or delete on public.imprest_cash
  for each row execute function public.fp_guard_imprest_cash();

alter table public.imprest_cash enable row level security;
drop policy if exists fp_member_read on public.imprest_cash;
drop policy if exists fp_cash_insert on public.imprest_cash;
drop policy if exists fp_cash_update on public.imprest_cash;
drop policy if exists fp_cash_delete on public.imprest_cash;
create policy fp_member_read on public.imprest_cash for select to authenticated using ((select public.fp_is_member()));
create policy fp_cash_insert on public.imprest_cash for insert to authenticated with check ((select public.fp_imprest_cash_role()));
create policy fp_cash_update on public.imprest_cash for update to authenticated
  using ((select public.fp_imprest_cash_role())) with check ((select public.fp_imprest_cash_role()));
create policy fp_cash_delete on public.imprest_cash for delete to authenticated using ((select public.fp_imprest_cash_role()));
grant select, insert, update, delete on public.imprest_cash to authenticated;
revoke all on public.imprest_cash from anon;

drop trigger if exists fp_audit on public.imprest_cash;
create trigger fp_audit after insert or update or delete on public.imprest_cash
  for each row execute function public.fp_audit();

-- 2. The week's money on the voucher ------------------------------------------
alter table public.imprest_vouchers add column if not exists collected_total numeric;
alter table public.imprest_vouchers add column if not exists closing_balance numeric;

-- what the latest earlier approved week closed on (negative = owed to the fleet office)
create or replace function public.fp_imprest_carry(wk date, me_id uuid) returns numeric
language sql stable as $$
  select coalesce((select v.closing_balance from public.imprest_vouchers v
                    where v.kind = 'weekly' and v.status = 'approved' and v.week_start < wk and v.id <> me_id
                    order by v.week_start desc limit 1), 0)
$$;

create or replace function public.fp_imprest_owed(lines jsonb) returns numeric
language sql immutable as $$
  select coalesce(sum(coalesce(nullif(e ->> 'qty', '')::numeric, 0) * coalesce(nullif(e ->> 'unitPrice', '')::numeric, 0)), 0)
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) e where e ->> 'type' = 'owed'
$$;

-- 3. The rules ---------------------------------------------------------------
create or replace function public.fp_guard_imprest() returns trigger
language plpgsql as $$
declare
  me       text := public.fp_role();
  mgr      boolean := public.fp_is_manager();
  cfg      jsonb;
  at_step  text;
  last_step integer;
  bal      numeric;
  owed_n   integer;
  pending  date;
begin
  if public.fp_is_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status not in ('draft', 'returned') then
      raise exception 'Only a draft, or a voucher that was sent back, can be deleted.';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.retired or new.approved_at is not null or new.paid_at is not null
       or new.approved_total is not null or new.to_pay_out is not null
       or new.collected_total is not null or new.closing_balance is not null then
      raise exception 'A new imprest voucher starts as a draft.';
    end if;
    new.chain := '[]'::jsonb; new.step := 0;
    new.created_by := auth.uid(); new.created_at := now(); new.updated_at := now();
    return new;
  end if;

  -- UPDATE ---------------------------------------------------------------------
  new.updated_at := now();
  if new.id <> old.id or new.created_by is distinct from old.created_by or new.created_at <> old.created_at then
    raise exception 'That cannot be changed.';
  end if;
  if not public.fp_imprest_history_ok(old.history, new.history) then
    raise exception 'The voucher history can only be added to.';
  end if;

  -- (a) draft / sent back: the fleet office logs the week's spending and submits it
  if old.status in ('draft', 'returned') then
    if not mgr then
      raise exception 'Only the fleet office can change a voucher before it is submitted.';
    end if;
    if new.status not in (old.status, 'in_approval') or new.retired or new.approved_at is not null
       or new.paid_at is not null or new.approved_total is not null or new.to_pay_out is not null
       or new.balance_bf is not null or new.collected_total is not null or new.closing_balance is not null then
      raise exception 'A voucher has to go through approval first.';
    end if;
    new.step := 0;
    if new.status = 'in_approval' then
      if new.kind = 'weekly' then
        select min(v.week_start) into pending from public.imprest_vouchers v
          where v.kind = 'weekly' and v.status <> 'approved' and v.week_start < new.week_start;
        if pending is not null then
          raise exception 'The voucher for the week of % has to be approved first - this week starts from what that week leaves.', to_char(pending, 'DD Mon');
        end if;
      end if;
      select count(*) into owed_n from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb)) e where e ->> 'type' = 'owed';
      if owed_n > 0 then
        if new.kind <> 'weekly' or owed_n > 1 then
          raise exception 'Only a weekly voucher can carry one line for money owed from last week.';
        end if;
        bal := public.fp_imprest_carry(new.week_start, new.id);
        if public.fp_imprest_owed(new.lines) <> greatest(0, -bal) then
          raise exception 'The amount owed to the fleet office from last week must be % (what last week was overspent).', greatest(0, -bal);
        end if;
      end if;
      select chain into cfg from public.imprest_config where id = 1;
      new.chain := coalesce(cfg, '["Audit", "HQ Accounts", "Senior Manager"]'::jsonb);
      new.submitted_at := now(); new.submitted_by := auth.uid();
      -- a (re)submitted voucher starts clean: earlier cuts are cleared
      new.lines := public.fp_imprest_strip(new.lines, array['allowed', 'cutNote']);
    end if;
    return new;
  end if;

  -- (b) in approval: only the role at the current step, or the Super Admin
  if old.status = 'in_approval' then
    at_step := old.chain ->> old.step;
    if me is null or not (me = at_step or me = 'Super Admin') then
      raise exception 'This voucher is waiting for % to approve.', coalesce(at_step, 'the approvers');
    end if;
    if public.fp_imprest_strip(new.lines, array['allowed', 'cutNote']) <> public.fp_imprest_strip(old.lines, array['allowed', 'cutNote']) then
      raise exception 'Approvers can only change the amount allowed on a line (with a reason).';
    end if;
    if (new.kind, new.week_start, new.title, new.chain, new.requested_total, new.retired, new.submitted_at,
        new.submitted_by, new.paid_at, new.spent_total)
       is distinct from (old.kind, old.week_start, old.title, old.chain, old.requested_total, old.retired, old.submitted_at,
        old.submitted_by, old.paid_at, old.spent_total) then
      raise exception 'Approvers can only approve, send back, or change the amounts allowed.';
    end if;
    last_step := jsonb_array_length(old.chain) - 1;
    new.approved_total := null; new.balance_bf := null; new.overspent_bf := null; new.to_pay_out := null;
    new.collected_total := null; new.closing_balance := null; new.approved_at := null; new.approved_by := null;

    if new.status = 'returned' then
      new.step := 0;
      return new;
    end if;
    if new.status = 'in_approval' then
      if not (new.step = old.step or (new.step = old.step + 1 and old.step < last_step)) then
        raise exception 'Approvals go one step at a time.';
      end if;
      return new;
    end if;
    if new.status = 'approved' then
      if old.step <> last_step then
        raise exception 'This voucher still has to be approved by %.', at_step;
      end if;
      -- the week's money is worked out here, not taken from the browser
      new.step := old.step;
      new.approved_total := public.fp_imprest_allowed_total(new.lines);
      new.approved_at := now(); new.approved_by := auth.uid();
      if new.kind = 'weekly' then
        bal := public.fp_imprest_carry(new.week_start, new.id);
        if public.fp_imprest_owed(new.lines) > greatest(0, -bal) then
          raise exception 'The amount owed from last week is more than last week was overspent (%).', greatest(0, -bal);
        end if;
        new.balance_bf := greatest(0, bal);
        new.overspent_bf := greatest(0, -bal);
        select coalesce(sum(c.amount), 0) into new.collected_total from public.imprest_cash c where c.week_start = new.week_start;
        new.closing_balance := new.balance_bf + new.collected_total - new.approved_total;
      else
        new.balance_bf := 0; new.overspent_bf := 0; new.to_pay_out := new.approved_total;
      end if;
      return new;
    end if;
    raise exception 'That is not a valid approval step.';
  end if;

  -- (c) approved: the money is fixed; the fleet office may still attach receipts
  if old.status = 'approved' then
    if public.fp_imprest_strip(new.lines, array['receipt']) <> public.fp_imprest_strip(old.lines, array['receipt']) then
      raise exception 'An approved voucher is fixed - only receipts can still be attached.';
    end if;
    if new.lines <> old.lines and not mgr then
      raise exception 'Only the fleet office attaches receipts.';
    end if;
    if (new.status, new.kind, new.week_start, new.title, new.chain, new.step, new.requested_total, new.approved_total,
        new.balance_bf, new.overspent_bf, new.to_pay_out, new.collected_total, new.closing_balance, new.approved_at,
        new.approved_by, new.submitted_at, new.submitted_by, new.paid_at, new.paid_by, new.paid_note, new.retired,
        new.spent_total)
       is distinct from (old.status, old.kind, old.week_start, old.title, old.chain, old.step, old.requested_total, old.approved_total,
        old.balance_bf, old.overspent_bf, old.to_pay_out, old.collected_total, old.closing_balance, old.approved_at,
        old.approved_by, old.submitted_at, old.submitted_by, old.paid_at, old.paid_by, old.paid_note, old.retired,
        old.spent_total) then
      raise exception 'An approved voucher is fixed.';
    end if;
    return new;
  end if;

  raise exception 'That change is not allowed.';
end $$;

-- PROOF: expect  4 | 2 | true | 1 | 1
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'imprest_cash') as cash_rules,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'imprest_vouchers'
          and column_name in ('collected_total', 'closing_balance')) as new_columns,
       (select prosrc like '%closing_balance%' from pg_proc where proname = 'fp_guard_imprest') as new_rules,
       (select count(*) from pg_trigger where tgname = 'fp_guard_imprest_cash') as cash_lock,
       (select count(*) from pg_trigger where tgname = 'fp_audit' and tgrelid = 'public.imprest_cash'::regclass) as cash_history;
