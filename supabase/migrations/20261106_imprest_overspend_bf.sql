-- ============================================================================
-- IMPREST: AN OVERSPENT WEEK COMES IN AS A NEGATIVE BALANCE BROUGHT FORWARD
-- (2026-11-06, Makinde). Replaces the 'owed' line of 20261027_imprest_owed.sql.
-- ============================================================================
-- Week of 26 Oct: N30,000 collected, N34,200 spent -> closed at -N4,200. The app
-- then put a line "OWED TO THE FLEET OFFICE FROM LAST WEEK" (N4,200) on the next
-- week's voucher, so the same N4,200 was counted as spending TWICE: the cash book
-- showed N64,200 spent in two weeks when N60,000 was (34,200 + 25,800).
--
-- Now a week starts from last week's closing AS IT IS, negative or positive:
--   closing = last week's closing + cash collected - approved spending
--   week of 2 Nov: -4,200 + 30,000 - 25,800 = 0
-- The overspend was already approved with last week's voucher. balance_bf /
-- overspent_bf still show it (one of them is 0). Zoho was already right: Journal 2
-- never included the owed line.
--
-- This migration:
--   1. adds imprest_config.overspend_carried (always true) -- the app reads it to
--      know this rule is in force before it stops adding the owed line;
--   2. replaces fp_guard_imprest: a voucher with an 'owed' line can't be submitted,
--      and one already in approval can only be sent back; final approval carries
--      the signed balance;
--   3. removes the owed line from vouchers not yet submitted (the week of 2 Nov).
-- Safe to re-run.
-- ============================================================================

alter table public.imprest_config add column if not exists overspend_carried boolean not null default true;
comment on column public.imprest_config.overspend_carried is
  'Always true since 20261106: an overspent week comes in as a negative balance brought forward (no owed line). The app checks for this column.';

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
      -- last week's overspend comes in as a NEGATIVE balance brought forward, not as a line
      select count(*) into owed_n from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb)) e where e ->> 'type' = 'owed';
      if owed_n > 0 then
        raise exception 'Last week''s overspend now comes in as a negative balance brought forward - remove the "owed to the fleet office" line (refresh the page) and submit again.';
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
    select count(*) into owed_n from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb)) e where e ->> 'type' = 'owed';
    if owed_n > 0 then
      raise exception 'This voucher still has an "owed to the fleet office" line, which would count last week''s overspend twice - send it back so the fleet office can remove it (it now comes in as a negative balance brought forward).';
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
        -- brought forward is SIGNED: last week's closing, negative when it was overspent
        -- (shown as balance_bf / overspent_bf, one of them 0)
        bal := public.fp_imprest_carry(new.week_start, new.id);
        new.balance_bf := greatest(0, bal);
        new.overspent_bf := greatest(0, -bal);
        select coalesce(sum(c.amount), 0) into new.collected_total from public.imprest_cash c where c.week_start = new.week_start;
        new.closing_balance := bal + new.collected_total - new.approved_total;
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

-- the week of 2 Nov (any voucher not yet submitted): take the owed line off
update public.imprest_vouchers v
   set lines = (select coalesce(jsonb_agg(e order by n), '[]'::jsonb)
                  from jsonb_array_elements(v.lines) with ordinality as t(e, n)
                 where e ->> 'type' is distinct from 'owed'),
       updated_at = now()
 where v.status in ('draft', 'returned')
   and exists (select 1 from jsonb_array_elements(v.lines) e where e ->> 'type' = 'owed');

-- Proof it took (expect one row: true | true | 0):
select
  (select overspend_carried from public.imprest_config where id = 1) as carried,
  (select prosrc like '%negative balance brought forward%' and prosrc like '%bal + new.collected_total%'
     from pg_proc where proname = 'fp_guard_imprest') as new_rule,
  (select count(*) from public.imprest_vouchers v, jsonb_array_elements(v.lines) e
    where v.status <> 'approved' and e ->> 'type' = 'owed') as owed_lines_left;
