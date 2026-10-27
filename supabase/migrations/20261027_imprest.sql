-- =============================================================================
-- FLEET IMPREST (weekly petty cash for the fleet office) (2026-10-27).
-- =============================================================================
-- Same workflow as the DRS imprest, without HR. The fleet office (Fleet Manager
-- or Super Admin) keeps ONE shared voucher per week (Mon-Sun) plus any number of
-- mid-week requests. A voucher is submitted, approved step by step (default
-- order: Audit -> HQ Accounts -> Senior Manager; the Super Admin can change the
-- order), and the final approval fixes the money: last week's unspent cash
-- (balance b/f) comes off, the rest is paid out by head office. Afterwards the
-- fleet office records what was actually spent per line (+ receipts) and
-- RETIRES the voucher; a new weekly voucher cannot be submitted while an
-- earlier approved one is not retired.
--
--   imprest_config     one row: chain = the approval order (Super Admin only)
--   imprest_vouchers   one row per voucher; lines and history are JSON arrays
--
-- New roles 'Audit', 'HQ Accounts', 'Senior Manager': they read everything (like
-- a Viewer) and write NOTHING except imprest decisions at their own step.
-- The Super Admin can act at any step.
-- Safe to re-run.
-- =============================================================================

-- 1. The three approver roles are members (read access everywhere) -----------
create or replace function public.fp_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fp_role() in ('Super Admin', 'Fleet Manager', 'Store Staff', 'Viewer',
                                       'Audit', 'HQ Accounts', 'Senior Manager'), false)
$$;

create or replace function public.fp_is_imprest_approver() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.fp_role() in ('Super Admin', 'Audit', 'HQ Accounts', 'Senior Manager'), false)
$$;

-- 2. The approval order -------------------------------------------------------
create table if not exists public.imprest_config (
  id         integer primary key default 1 check (id = 1),
  chain      jsonb not null default '["Audit", "HQ Accounts", "Senior Manager"]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
insert into public.imprest_config (id) values (1) on conflict (id) do nothing;

create or replace function public.fp_guard_imprest_config() returns trigger
language plpgsql as $$
declare r text;
begin
  if jsonb_typeof(new.chain) is distinct from 'array' or jsonb_array_length(new.chain) = 0 then
    raise exception 'The approval order needs at least one step.';
  end if;
  for r in select value from jsonb_array_elements_text(new.chain) loop
    if r not in ('Audit', 'HQ Accounts', 'Senior Manager', 'Super Admin') then
      raise exception 'Unknown approval step: %', r;
    end if;
  end loop;
  if (select count(distinct value) from jsonb_array_elements_text(new.chain)) <> jsonb_array_length(new.chain) then
    raise exception 'A role can only appear once in the approval order.';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists fp_guard_imprest_config on public.imprest_config;
create trigger fp_guard_imprest_config before insert or update on public.imprest_config
  for each row execute function public.fp_guard_imprest_config();

alter table public.imprest_config enable row level security;
drop policy if exists fp_member_read on public.imprest_config;
drop policy if exists fp_super_update on public.imprest_config;
create policy fp_member_read on public.imprest_config for select to authenticated using ((select public.fp_is_member()));
create policy fp_super_update on public.imprest_config for update to authenticated
  using ((select public.fp_is_super())) with check ((select public.fp_is_super()));
grant select, update on public.imprest_config to authenticated;
revoke all on public.imprest_config from anon;

-- 3. The vouchers --------------------------------------------------------------
create table if not exists public.imprest_vouchers (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'weekly' check (kind in ('weekly', 'midweek')),
  week_start      date not null check (extract(isodow from week_start) = 1),   -- the Monday
  title           text,
  status          text not null default 'draft' check (status in ('draft', 'in_approval', 'returned', 'approved')),
  chain           jsonb not null default '[]'::jsonb,     -- approval order, fixed when submitted
  step            integer not null default 0,             -- position in chain while in approval
  lines           jsonb not null default '[]'::jsonb,
  history         jsonb not null default '[]'::jsonb,
  requested_total numeric not null default 0,
  approved_total  numeric,
  spent_total     numeric,
  balance_bf      numeric check (balance_bf is null or balance_bf >= 0),
  overspent_bf    numeric check (overspent_bf is null or overspent_bf >= 0),
  to_pay_out      numeric check (to_pay_out is null or to_pay_out >= 0),
  submitted_at    timestamptz,
  submitted_by    uuid,
  approved_at     timestamptz,
  approved_by     uuid,
  paid_at         timestamptz,
  paid_by         uuid,
  paid_note       text,
  retired         boolean not null default false,
  retired_at      timestamptz,
  retired_by      uuid,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists imprest_one_weekly_per_week on public.imprest_vouchers (week_start) where kind = 'weekly';
create index if not exists imprest_vouchers_week_idx on public.imprest_vouchers (week_start);

-- lines without the given keys (to check that nothing else on a line changed)
create or replace function public.fp_imprest_strip(lines jsonb, keys text[]) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(e - keys order by i), '[]'::jsonb)
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) with ordinality t(e, i)
$$;

-- the approved total: each line's allowed amount, else qty x unit price
create or replace function public.fp_imprest_allowed_total(lines jsonb) returns numeric
language sql immutable as $$
  select coalesce(sum(coalesce(nullif(e ->> 'allowed', '')::numeric,
                               coalesce(nullif(e ->> 'qty', '')::numeric, 0) * coalesce(nullif(e ->> 'unitPrice', '')::numeric, 0))), 0)
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) e
$$;

-- what was spent: the sum of each line's spent amount
create or replace function public.fp_imprest_spent_total(lines jsonb) returns numeric
language sql immutable as $$
  select coalesce(sum(coalesce(nullif(e ->> 'spent', '')::numeric, 0)), 0)
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) e
$$;

-- unspent cash from the latest earlier week that has approved vouchers:
-- sum of (cash held - spent); cash held = max(approved, its own balance b/f) for
-- a weekly voucher, the approved amount for a mid-week one. Negative = overspent.
create or replace function public.fp_imprest_carry(wk date, me_id uuid) returns numeric
language sql stable as $$
  with prev as (select max(week_start) w from public.imprest_vouchers
                where status = 'approved' and week_start < wk and id <> me_id)
  select coalesce(sum(case when v.kind = 'weekly' then greatest(v.approved_total, coalesce(v.balance_bf, 0))
                           else v.approved_total end - coalesce(v.spent_total, 0)), 0)
  from public.imprest_vouchers v, prev
  where v.status = 'approved' and v.week_start = prev.w and v.id <> me_id
$$;

-- history can only be added to
create or replace function public.fp_imprest_history_ok(o jsonb, n jsonb) returns boolean
language sql immutable as $$
  select jsonb_array_length(coalesce(n, '[]'::jsonb)) >= jsonb_array_length(coalesce(o, '[]'::jsonb))
     and coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(coalesce(n, '[]'::jsonb)) with ordinality t(e, i)
                   where i <= jsonb_array_length(coalesce(o, '[]'::jsonb))), '[]'::jsonb) = coalesce(o, '[]'::jsonb)
$$;

create or replace function public.fp_guard_imprest() returns trigger
language plpgsql as $$
declare
  me     text := public.fp_role();
  mgr    boolean := public.fp_is_manager();
  cfg    jsonb;
  bal    numeric;
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

drop trigger if exists fp_guard_imprest on public.imprest_vouchers;
create trigger fp_guard_imprest before insert or update or delete on public.imprest_vouchers
  for each row execute function public.fp_guard_imprest();

alter table public.imprest_vouchers enable row level security;
drop policy if exists fp_member_read on public.imprest_vouchers;
drop policy if exists fp_manager_insert on public.imprest_vouchers;
drop policy if exists fp_imprest_update on public.imprest_vouchers;
drop policy if exists fp_manager_delete on public.imprest_vouchers;
create policy fp_member_read on public.imprest_vouchers for select to authenticated using ((select public.fp_is_member()));
create policy fp_manager_insert on public.imprest_vouchers for insert to authenticated with check ((select public.fp_is_manager()));
create policy fp_imprest_update on public.imprest_vouchers for update to authenticated
  using ((select public.fp_is_manager()) or (select public.fp_is_imprest_approver()))
  with check ((select public.fp_is_manager()) or (select public.fp_is_imprest_approver()));
create policy fp_manager_delete on public.imprest_vouchers for delete to authenticated using ((select public.fp_is_manager()));
grant select, insert, update, delete on public.imprest_vouchers to authenticated;
revoke all on public.imprest_vouchers from anon;

-- 4. Change history -----------------------------------------------------------
drop trigger if exists fp_audit on public.imprest_vouchers;
create trigger fp_audit after insert or update or delete on public.imprest_vouchers
  for each row execute function public.fp_audit();
drop trigger if exists fp_audit on public.imprest_config;
create trigger fp_audit after insert or update or delete on public.imprest_config
  for each row execute function public.fp_audit();

-- PROOF: expect  4 | 2 | 2 | 1 | true
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'imprest_vouchers') as voucher_rules,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'imprest_config') as order_rules,
       (select count(*) from pg_trigger where tgname = 'fp_audit'
          and tgrelid in ('public.imprest_vouchers'::regclass, 'public.imprest_config'::regclass)) as history_triggers,
       (select count(*) from public.imprest_config) as approval_order,
       (select prosrc like '%Senior Manager%' from pg_proc where proname = 'fp_is_member') as approvers_can_read;
