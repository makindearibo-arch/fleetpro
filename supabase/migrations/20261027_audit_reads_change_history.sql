-- =============================================================================
-- THE AUDIT ROLE CAN READ THE CHANGE HISTORY (2026-10-27).
-- =============================================================================
-- Until now only the Super Admin could read public.audit_log (Settings -> Change
-- history, and Diesel Management -> Daily stock -> "Changed after the count").
-- Makinde: give the Audit role the same view, still READ-ONLY -- nobody can write
-- to audit_log from the app (no insert/update/delete grants; only the fp_audit
-- trigger and the set-password server function add rows).
-- Safe to re-run.
-- =============================================================================

drop policy if exists fp_audit_read on public.audit_log;
create policy fp_audit_read on public.audit_log for select to authenticated
  using ((select public.fp_is_super()) or (select public.fp_role()) = 'Audit');

-- PROOF: expect  1 | 0
select (select count(*) from pg_policies where schemaname = 'public' and tablename = 'audit_log'
          and policyname = 'fp_audit_read' and qual like '%Audit%') as audit_can_read_history,
       (select count(*) from information_schema.role_table_grants where table_schema = 'public'
          and table_name = 'audit_log' and grantee = 'authenticated'
          and privilege_type in ('INSERT', 'UPDATE', 'DELETE')) as app_can_write_history;
