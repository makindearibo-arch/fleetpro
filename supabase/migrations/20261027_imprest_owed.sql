-- =============================================================================
-- IMPREST: MONEY OWED TO THE FLEET OFFICE FROM AN OVERSPENT WEEK (2026-10-27).
-- =============================================================================
-- Makinde: when the fleet office spends more than it was given, the difference is
-- owed to it and is paid back on the next week's voucher -- but only what the
-- approvers allow. The app adds ONE line of type 'owed' to the next weekly voucher
-- for exactly last week's overspend; approvers can lower it (with a reason) like
-- any line, and whatever they allow is part of the approved total and so of the
-- amount paid out. This replaces fp_guard_imprest (20261027_imprest.sql) with the
-- same rules plus: on submit, an 'owed' line is allowed only on a weekly voucher,
-- only once, and only for exactly what the latest earlier week was overspent
-- (worked out by the database, fp_imprest_carry); on final approval it may not be
-- more than that overspend.
-- Safe to re-run.
-- =============================================================================

create or replace function public.fp_guard_imprest() returns trigger
language plpgsql as $$
declare
  me     text := public.fp_role();
  mgr    boolean := public.fp_is_manager();
  cfg    jsonb;
  bal    numeric;
  owed_n   integer;
  owed_amt numeric;
  at_step text;
  last_step integer;
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
       or new.approved_total is not null or new.to_pay_out is not null then
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

  -- (a) draft / sent back: the fleet office edits it and submits it
  if old.status in ('draft', 'returned') then
    if not mgr then
      raise exception 'Only the fleet office can change a voucher before it is submitted.';
    end if;
    if new.status not in (old.status, 'in_approval') or new.retired or new.approved_at is not null
       or new.paid_at is not null or new.approved_total is not null or new.to_pay_out is not null
       or new.balance_bf is not null then
      raise exception 'A voucher has to go through approval first.';
    end if;
    new.step := 0;
    if new.status = 'in_approval' then
      if new.kind = 'weekly' and exists (select 1 from public.imprest_vouchers v
          where v.status = 'approved' and not v.retired and v.week_start < new.week_start) then
        raise exception 'Record how the earlier imprest was spent (retire it) before submitting this week''s voucher.';
      end if;
      -- money owed to the fleet office from an overspent last week: at most one line,
      -- weekly vouchers only, and exactly what last week was overspent
      select count(*), coalesce(sum(coalesce(nullif(e ->> 'qty', '')::numeric, 0) * coalesce(nullif(e ->> 'unitPrice', '')::numeric, 0)), 0)
        into owed_n, owed_amt
        from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb)) e where e ->> 'type' = 'owed';
      if owed_n > 0 then
        if new.kind <> 'weekly' or owed_n > 1 then
          raise exception 'Only a weekly voucher can carry one line for money owed from last week.';
        end if;
        bal := public.fp_imprest_carry(new.week_start, new.id);
        if owed_amt <> greatest(0, -bal) then
          raise exception 'The amount owed to the fleet office from last week must be % (what last week was overspent).', greatest(0, -bal);
        end if;
      end if;
      select chain into cfg from public.imprest_config where id = 1;
      new.chain := coalesce(cfg, '["Audit", "HQ Accounts", "Senior Manager"]'::jsonb);
      new.submitted_at := now(); new.submitted_by := auth.uid();
      -- a (re)submitted voucher starts clean: earlier cuts and spending are cleared
      new.lines := public.fp_imprest_strip(new.lines, array['allowed', 'cutNote', 'spent', 'receipt', 'spentNote']);
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

    if new.status = 'returned' then
      new.step := 0;
      new.approved_total := null; new.balance_bf := null; new.overspent_bf := null; new.to_pay_out := null;
      new.approved_at := null; new.approved_by := null;
      return new;
    end if;

    if new.status = 'in_approval' then
      if not (new.step = old.step or (new.step = old.step + 1 and old.step < last_step)) then
        raise exception 'Approvals go one step at a time.';
      end if;
      new.approved_total := null; new.balance_bf := null; new.overspent_bf := null; new.to_pay_out := null;
      new.approved_at := null; new.approved_by := null;
      return new;
    end if;

    if new.status = 'approved' then
      if old.step <> last_step then
        raise exception 'This voucher still has to be approved by %.', at_step;
      end if;
      -- the money is worked out here, not taken from the browser
      new.step := old.step;
      new.approved_total := public.fp_imprest_allowed_total(new.lines);
      new.approved_at := now(); new.approved_by := auth.uid();
      if new.kind = 'midweek' then
        new.balance_bf := 0; new.overspent_bf := 0;
        new.to_pay_out := new.approved_total;
      else
        bal := public.fp_imprest_carry(new.week_start, new.id);
        select coalesce(sum(coalesce(nullif(e ->> 'qty', '')::numeric, 0) * coalesce(nullif(e ->> 'unitPrice', '')::numeric, 0)), 0)
          into owed_amt
          from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb)) e where e ->> 'type' = 'owed';
        if owed_amt > greatest(0, -bal) then
          raise exception 'The amount owed from last week is more than last week was overspent (%).', greatest(0, -bal);
        end if;
        new.balance_bf := greatest(0, bal);
        new.overspent_bf := greatest(0, -bal);   -- shown to approvers, never added to this week
        new.to_pay_out := greatest(0, new.approved_total - new.balance_bf);
      end if;
      return new;
    end if;
    raise exception 'That is not a valid approval step.';
  end if;

  -- (c) approved: the fleet office records the spending and retires it;
  --     HQ Accounts or the Super Admin marks it paid out
  if old.status = 'approved' then
    if new.status <> 'approved' then
      raise exception 'An approved voucher stays approved.';
    end if;
    if (new.kind, new.week_start, new.title, new.chain, new.step, new.requested_total, new.approved_total,
        new.balance_bf, new.overspent_bf, new.to_pay_out, new.approved_at, new.approved_by, new.submitted_at, new.submitted_by)
       is distinct from (old.kind, old.week_start, old.title, old.chain, old.step, old.requested_total, old.approved_total,
        old.balance_bf, old.overspent_bf, old.to_pay_out, old.approved_at, old.approved_by, old.submitted_at, old.submitted_by) then
      raise exception 'The approved amounts cannot be changed.';
    end if;
    if (new.paid_at, new.paid_note) is distinct from (old.paid_at, old.paid_note) then
      if me is null or me not in ('HQ Accounts', 'Super Admin') then
        raise exception 'Only HQ Accounts or the Super Admin can mark imprest as paid out.';
      end if;
      if old.paid_at is not null and me <> 'Super Admin' then
        raise exception 'It is already marked as paid out.';
      end if;
      new.paid_by := case when new.paid_at is null then null else auth.uid() end;
    elsif new.paid_by is distinct from old.paid_by then
      raise exception 'That cannot be changed.';
    end if;
    if public.fp_imprest_strip(new.lines, array['spent', 'receipt', 'spentNote'])
       <> public.fp_imprest_strip(old.lines, array['spent', 'receipt', 'spentNote']) then
      raise exception 'Only what was spent (and receipts) can be recorded on an approved voucher.';
    end if;
    if new.lines <> old.lines or new.retired <> old.retired or new.spent_total is distinct from old.spent_total
       or new.retired_at is distinct from old.retired_at or new.retired_by is distinct from old.retired_by then
      if old.retired then
        raise exception 'This voucher is retired - its spending is locked.';
      end if;
      if not mgr then
        raise exception 'Only the fleet office records how imprest was spent.';
      end if;
      new.spent_total := public.fp_imprest_spent_total(new.lines);
      if new.retired then
        new.retired_at := now(); new.retired_by := auth.uid();
      else
        new.retired_at := null; new.retired_by := null;
      end if;
    end if;
    return new;
  end if;

  raise exception 'That change is not allowed.';
end $$;

-- PROOF: expect  true | 1
select (select prosrc like '%owed%' from pg_proc where proname = 'fp_guard_imprest') as owed_rule_in_place,
       (select count(*) from pg_trigger where tgname = 'fp_guard_imprest'
          and tgrelid = 'public.imprest_vouchers'::regclass) as guard_trigger;
