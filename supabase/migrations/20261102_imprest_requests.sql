-- =============================================================================
-- IMPREST: THE FLEET OFFICE REQUESTS CASH; AUDIT -> SENIOR MANAGER APPROVE;
-- HQ ACCOUNTS ONLY GIVES AND POSTS IT (2026-11-02).
-- =============================================================================
-- Makinde: "just the approval flow for all including this - it's just Audit to SM,
-- and once SM approves all accounts does is provide the money and post it.
-- Accounts does not approve anything."
--
--   1. The approval order is Audit -> Senior Manager. HQ Accounts is taken out
--      of it and can no longer be put back in (Settings -> imprest approvals).
--      A voucher already in approval with HQ Accounts in its order skips that step.
--   2. imprest_requests  the Fleet Manager / Super Admin asks for cash for a week
--      (the week's money, or extra): amount + reason. It is approved like a
--      voucher, step by step (the order at the moment it is sent); an approver may
--      lower the amount (with a reason) or send it back. The final approval fixes
--      approved_amount.
--   3. imprest_cash.request_id  HQ Accounts posts the cash AGAINST an approved
--      request -- exactly the approved amount, kind and week, once. Only the Super
--      Admin may still record cash with no request.
--
-- Safe to re-run.
-- =============================================================================

-- 1. HQ Accounts approves nothing ---------------------------------------------
create or replace function public.fp_guard_imprest_config() returns trigger
language plpgsql as $$
declare r text;
begin
  if jsonb_typeof(new.chain) is distinct from 'array' or jsonb_array_length(new.chain) = 0 then
    raise exception 'The approval order needs at least one step.';
  end if;
  for r in select value from jsonb_array_elements_text(new.chain) loop
    if r = 'HQ Accounts' then
      raise exception 'HQ Accounts does not approve imprest - it gives and posts the cash once the request is approved.';
    end if;
    if r not in ('Audit', 'Senior Manager', 'Super Admin') then
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

-- the order without HQ Accounts (keeps the rest of the order as it is)
create or replace function public.fp_imprest_drop_hq(c jsonb) returns jsonb
language sql immutable as $$
  select coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(coalesce(c, '[]'::jsonb)) with ordinality t(e, i)
                   where e <> to_jsonb('HQ Accounts'::text)), '[]'::jsonb)
$$;

alter table public.imprest_config alter column chain set default '["Audit", "Senior Manager"]'::jsonb;
update public.imprest_config set chain = public.fp_imprest_drop_hq(chain) where id = 1 and chain ? 'HQ Accounts';

-- a voucher already in approval: drop the HQ Accounts step; if it was waiting for
-- HQ Accounts it moves on to the next role (the SQL editor bypasses the voucher rules)
update public.imprest_vouchers v
   set chain = public.fp_imprest_drop_hq(v.chain),
       step  = (select count(*) from jsonb_array_elements_text(v.chain) with ordinality t(e, i)
                 where i <= v.step and e <> 'HQ Accounts')
 where v.status = 'in_approval' and v.chain ? 'HQ Accounts';

-- 2. Cash requests -------------------------------------------------------------
create table if not exists public.imprest_requests (
  id              uuid primary key default gen_random_uuid(),
  week_start      date not null check (extract(isodow from week_start) = 1),
  kind            text not null default 'weekly' check (kind in ('weekly', 'extra')),
  amount          numeric not null check (amount > 0),
  reason          text,
  status          text not null default 'in_approval' check (status in ('in_approval', 'returned', 'approved')),
  chain           jsonb not null default '[]'::jsonb,
  step            integer not null default 0,
  allowed         numeric check (allowed is null or allowed > 0),
  cut_note        text,
  approved_amount numeric,
  history         jsonb not null default '[]'::jsonb,
  requested_by    uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  approved_at     timestamptz,
  approved_by     uuid,
  updated_at      timestamptz not null default now()
);
create index if not exists imprest_requests_week_idx on public.imprest_requests (week_start);

-- a week whose voucher is approved is closed: its cash is fixed
create or replace function public.fp_imprest_week_closed(wk date) returns boolean
language sql stable as $$
  select exists (select 1 from public.imprest_vouchers v where v.kind = 'weekly' and v.status = 'approved' and v.week_start = wk)
$$;

create or replace function public.fp_guard_imprest_request() returns trigger
language plpgsql as $$
declare
  me        text := public.fp_role();
  mgr       boolean := public.fp_is_manager();
  cfg       jsonb;
  at_step   text;
  last_step integer;
begin
  if public.fp_is_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status = 'approved' and me is distinct from 'Super Admin' then
      raise exception 'An approved cash request cannot be deleted.';
    end if;
    return old;   -- once cash is posted against it, the cash row's link stops the delete
  end if;

  if tg_op = 'INSERT' then
    if public.fp_imprest_week_closed(new.week_start) then
      raise exception 'The week of % is already approved - ask for the cash in the current week.', to_char(new.week_start, 'DD Mon');
    end if;
    -- a request is sent for approval as soon as it is made, in today's order
    select chain into cfg from public.imprest_config where id = 1;
    new.status := 'in_approval'; new.chain := coalesce(cfg, '["Audit", "Senior Manager"]'::jsonb); new.step := 0;
    new.allowed := null; new.cut_note := null;
    new.approved_amount := null; new.approved_at := null; new.approved_by := null;
    new.requested_by := auth.uid(); new.created_at := now(); new.submitted_at := now(); new.updated_at := now();
    return new;
  end if;

  -- UPDATE ---------------------------------------------------------------------
  new.updated_at := now();
  if new.id <> old.id or new.requested_by is distinct from old.requested_by or new.created_at <> old.created_at then
    raise exception 'That cannot be changed.';
  end if;
  if not public.fp_imprest_history_ok(old.history, new.history) then
    raise exception 'The request history can only be added to.';
  end if;

  -- (a) sent back: the fleet office changes it and sends it again (approval restarts)
  if old.status = 'returned' then
    if not mgr then
      raise exception 'Only the fleet office can change a request that was sent back.';
    end if;
    if new.status not in ('returned', 'in_approval') then
      raise exception 'A cash request has to go through approval first.';
    end if;
    if public.fp_imprest_week_closed(new.week_start) then
      raise exception 'The week of % is already approved - ask for the cash in the current week.', to_char(new.week_start, 'DD Mon');
    end if;
    new.allowed := null; new.cut_note := null;
    new.approved_amount := null; new.approved_at := null; new.approved_by := null; new.step := 0;
    if new.status = 'in_approval' then
      select chain into cfg from public.imprest_config where id = 1;
      new.chain := coalesce(cfg, '["Audit", "Senior Manager"]'::jsonb); new.submitted_at := now();
    else
      new.chain := old.chain; new.submitted_at := old.submitted_at;
    end if;
    return new;
  end if;

  -- (b) in approval: only the role at the current step, or the Super Admin
  if old.status = 'in_approval' then
    at_step := old.chain ->> old.step;
    if me is null or not (me = at_step or me = 'Super Admin') then
      raise exception 'This cash request is waiting for % to approve.', coalesce(at_step, 'the approvers');
    end if;
    if (new.week_start, new.kind, new.amount, new.reason, new.chain, new.submitted_at)
       is distinct from (old.week_start, old.kind, old.amount, old.reason, old.chain, old.submitted_at) then
      raise exception 'Approvers can only approve, send back, or lower the amount (with a reason).';
    end if;
    if new.allowed is not null and new.allowed > old.amount then
      raise exception 'The amount approved cannot be more than was asked for (%).', old.amount;
    end if;
    if new.allowed is null or new.allowed >= old.amount then
      new.allowed := null; new.cut_note := null;
    elsif coalesce(length(trim(new.cut_note)), 0) < 3 then
      raise exception 'Give a reason for lowering the amount.';
    end if;
    last_step := jsonb_array_length(old.chain) - 1;
    new.approved_amount := null; new.approved_at := null; new.approved_by := null;
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
        raise exception 'This cash request still has to be approved by %.', at_step;
      end if;
      new.step := old.step;
      new.approved_amount := coalesce(new.allowed, old.amount);
      new.approved_at := now(); new.approved_by := auth.uid();
      return new;
    end if;
    raise exception 'That is not a valid approval step.';
  end if;

  -- (c) approved: fixed
  if (new.week_start, new.kind, new.amount, new.reason, new.status, new.chain, new.step, new.allowed, new.cut_note,
      new.approved_amount, new.history, new.submitted_at, new.approved_at, new.approved_by)
     is distinct from (old.week_start, old.kind, old.amount, old.reason, old.status, old.chain, old.step, old.allowed, old.cut_note,
      old.approved_amount, old.history, old.submitted_at, old.approved_at, old.approved_by) then
    raise exception 'An approved cash request is fixed.';
  end if;
  return new;
end $$;

drop trigger if exists fp_guard_imprest_request on public.imprest_requests;
create trigger fp_guard_imprest_request before insert or update or delete on public.imprest_requests
  for each row execute function public.fp_guard_imprest_request();

alter table public.imprest_requests enable row level security;
drop policy if exists fp_member_read on public.imprest_requests;
drop policy if exists fp_manager_insert on public.imprest_requests;
drop policy if exists fp_request_update on public.imprest_requests;
drop policy if exists fp_manager_delete on public.imprest_requests;
create policy fp_member_read on public.imprest_requests for select to authenticated using ((select public.fp_is_member()));
create policy fp_manager_insert on public.imprest_requests for insert to authenticated with check ((select public.fp_is_manager()));
create policy fp_request_update on public.imprest_requests for update to authenticated
  using ((select public.fp_is_manager()) or (select public.fp_is_imprest_approver()))
  with check ((select public.fp_is_manager()) or (select public.fp_is_imprest_approver()));
create policy fp_manager_delete on public.imprest_requests for delete to authenticated using ((select public.fp_is_manager()));
grant select, insert, update, delete on public.imprest_requests to authenticated;
revoke all on public.imprest_requests from anon;

drop trigger if exists fp_audit on public.imprest_requests;
create trigger fp_audit after insert or update or delete on public.imprest_requests
  for each row execute function public.fp_audit();

-- 3. Cash is posted against an approved request -------------------------------
alter table public.imprest_cash add column if not exists request_id uuid references public.imprest_requests (id) on delete restrict;
create unique index if not exists imprest_cash_request_uq on public.imprest_cash (request_id) where request_id is not null;

create or replace function public.fp_guard_imprest_cash() returns trigger
language plpgsql as $$
declare rq public.imprest_requests%rowtype;
begin
  if public.fp_is_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and exists (select 1 from public.imprest_vouchers v
      where v.kind = 'weekly' and v.status = 'approved' and v.week_start = old.week_start) then
    raise exception 'The week of % is already approved - its cash is fixed. Record it in the current week.', to_char(old.week_start, 'DD Mon');
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.request_id is null and public.fp_role() is distinct from 'Super Admin' then
    raise exception 'Only the Super Admin can change cash that was recorded without a request.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if exists (select 1 from public.imprest_vouchers v
      where v.kind = 'weekly' and v.status = 'approved' and v.week_start = new.week_start) then
    raise exception 'The week of % is already approved - its cash is fixed. Record it in the current week.', to_char(new.week_start, 'DD Mon');
  end if;
  if tg_op = 'UPDATE' and new.request_id is distinct from old.request_id then
    raise exception 'That cannot be changed.';
  end if;
  if new.request_id is null then
    if public.fp_role() is distinct from 'Super Admin' then
      raise exception 'Cash is given against a cash request once the Senior Manager has approved it.';
    end if;
  else
    select * into rq from public.imprest_requests where id = new.request_id;
    if rq.id is null or rq.status <> 'approved' then
      raise exception 'That cash request is not approved yet.';
    end if;
    if new.amount <> rq.approved_amount or new.week_start <> rq.week_start or new.kind <> rq.kind then
      raise exception 'Give exactly what was approved: % for the week of %.', rq.approved_amount, to_char(rq.week_start, 'DD Mon');
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.recorded_by := auth.uid(); new.created_at := now();
  else
    new.recorded_by := old.recorded_by; new.created_at := old.created_at;
  end if;
  return new;
end $$;

-- PROOF: expect  true | 4 | 2 | 1 | true
select (select chain = '["Audit", "Senior Manager"]'::jsonb from public.imprest_config where id = 1) as audit_then_sm,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'imprest_requests') as request_rules,
       (select count(*) from pg_trigger where tgrelid = 'public.imprest_requests'::regclass
          and tgname in ('fp_guard_imprest_request', 'fp_audit')) as request_triggers,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'imprest_cash'
          and column_name = 'request_id') as cash_link,
       (select prosrc like '%request_id%' from pg_proc where proname = 'fp_guard_imprest_cash') as cash_rule;
