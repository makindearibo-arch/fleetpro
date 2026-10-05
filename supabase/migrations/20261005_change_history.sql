-- ============================================================================
-- CHANGE HISTORY: the database records every change to stock-related records.
-- ============================================================================
-- Before this, an edit simply overwrote the old value and nothing recorded who
-- did it, so a quietly edited figure left no trace. These triggers run INSIDE
-- the database on every insert, edit and delete, so they cannot be skipped by
-- the app, by the API, or by a script: even changes made with the service-role
-- key are recorded (as "backend").
--
-- Tables covered -- each one can move stock on paper:
--   diesel_purchases (incl. stock reconciliations), diesel_distributions,
--   diesel_readings, diesel_transfers, generator_baselines (a raised baseline
--   hides losses), profiles (roles and stores), app_settings and diesel_locks
--   (how far back readings may be entered or edited).
--
-- Only a Super Admin can read the history (Settings -> Change history).
-- Nobody can edit or delete it from the app or the API.
--
-- Requires 20261005_access_rules.sql (uses its fp_* helpers). Safe to re-run.
-- ============================================================================

create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  table_name text not null,
  row_id     text,
  action     text not null,          -- INSERT / UPDATE / DELETE
  user_id    uuid,                   -- null for scripts and the SQL editor
  user_name  text,
  user_role  text,                   -- profile role, or 'backend'
  old_data   jsonb,
  new_data   jsonb,
  changed    text[]                  -- columns that changed (UPDATE only)
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_row_idx on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;
drop policy if exists fp_audit_read on public.audit_log;
create policy fp_audit_read on public.audit_log for select to authenticated
  using ((select public.fp_is_super()));
-- Read is granted explicitly (then narrowed to Super Admin by the policy above) rather than
-- relying on the project's default privileges for new tables. No insert/update/delete
-- grant or policy on purpose: only the trigger below writes.
grant select on public.audit_log to authenticated;
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
revoke all on public.audit_log from anon;

create or replace function public.fp_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_changed text[];
  v_uid uuid := auth.uid(); v_role text; v_name text;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    select array_agg(e.key order by e.key) into v_changed
      from jsonb_each(v_new) e where v_old -> e.key is distinct from e.value;
    if v_changed is null then return null; end if;   -- nothing actually changed
  end if;
  if v_uid is not null then
    select p.role, p.name into v_role, v_name from public.profiles p where p.id = v_uid;
  end if;
  insert into public.audit_log (table_name, row_id, action, user_id, user_name, user_role, old_data, new_data, changed)
  values (tg_table_name,
          coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key'),
          tg_op, v_uid, v_name,
          coalesce(v_role, case when v_uid is null then 'backend' else 'no profile' end),
          v_old, v_new, v_changed);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'diesel_purchases', 'diesel_distributions', 'diesel_readings', 'diesel_transfers',
    'generator_baselines', 'profiles', 'app_settings', 'diesel_locks'
  ] loop
    execute format('drop trigger if exists fp_audit on public.%I', t);
    execute format('create trigger fp_audit after insert or update or delete on public.%I for each row execute function public.fp_audit()', t);
  end loop;
end $$;
