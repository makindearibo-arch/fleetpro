-- ============================================================================
-- EMERGENCY ROLLBACK for 20261005_access_rules.sql
-- ============================================================================
-- Run this ONLY if the access rules stop people doing their normal work and you
-- need things working again immediately. It puts every table back exactly as it
-- was before (row-level security OFF, access controlled only by the app), which
-- also brings back the problem the rules fixed: anyone with the app's public
-- key can read and change data without logging in.
--
-- The change history (audit_log) is deliberately LEFT RUNNING and LEFT LOCKED:
-- it keeps recording, and it stays unreadable and unchangeable to the public.
-- ============================================================================

do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
           where schemaname = 'public' and tablename <> 'audit_log' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename <> 'audit_log' loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;

drop trigger if exists fp_guard_reconciliation on public.diesel_purchases;
drop trigger if exists fp_guard_distribution  on public.diesel_distributions;
drop trigger if exists fp_guard_generator     on public.generators;
drop trigger if exists fp_guard_profile       on public.profiles;

-- File storage back to "any logged-in user" (as in 20260922_document_uploads.sql).
drop policy if exists "documents_members_all" on storage.objects;
drop policy if exists "documents_authenticated_all" on storage.objects;
create policy "documents_authenticated_all" on storage.objects for all to authenticated
  using (bucket_id = 'documents') with check (bucket_id = 'documents');
drop policy if exists "meter_photos_members_all" on storage.objects;
drop policy if exists "meter_photos_authenticated_all" on storage.objects;
create policy "meter_photos_authenticated_all" on storage.objects for all to authenticated
  using (bucket_id = 'meter-photos') with check (bucket_id = 'meter-photos');

-- The fp_* helper functions are left in place: they do nothing on their own,
-- and leaving them lets 20261005_access_rules.sql be re-applied cleanly later.
