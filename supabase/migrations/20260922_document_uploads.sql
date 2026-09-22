-- Attachments: fuel receipts, work-order invoices, scanned vehicle papers.
-- Run this in Supabase -> SQL Editor. Until it is run, the app simply hides the
-- upload controls (it probes for these columns on startup), so deploying the
-- code before running this is safe -- the feature just stays switched off.

-- 1. One attached file per record. These hold the STORAGE PATH, not a URL:
--    the `documents` bucket is PRIVATE and the app mints a short-lived signed
--    URL when someone opens a file. A stored public URL would let anyone who
--    ever saw the link read an invoice or a vehicle registration for good.
alter table public.fuel_logs   add column if not exists receipt_path text;
alter table public.work_orders add column if not exists invoice_path text;
alter table public.papers      add column if not exists doc_path     text;

-- 2. Buckets.
--    documents    -> PRIVATE. Receipts, invoices, vehicle papers: money and
--                    registration details, so they are not world-readable.
--    meter-photos -> PUBLIC. DieselLogPage has uploaded to this bucket since it
--                    was written, but THE BUCKET WAS NEVER CREATED: every
--                    upload failed, the code swallowed the error and stored "",
--                    so all 2,483 gen_photo_url values are the empty string and
--                    no meter photo has ever been kept. Public because that code
--                    calls getPublicUrl(); the images are photos of a gauge.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 10485760,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']),
  ('meter-photos', 'meter-photos', true, 10485760,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Storage policies. Unlike the public tables (see
--    20260512_disable_rls_all_public_tables.sql), storage.objects keeps RLS ON
--    and ships with no policies, so without these every upload from the browser
--    is rejected even though the bucket exists.
drop policy if exists "documents_authenticated_all" on storage.objects;
create policy "documents_authenticated_all" on storage.objects
  for all to authenticated
  using      (bucket_id = 'documents')
  with check (bucket_id = 'documents');

drop policy if exists "meter_photos_authenticated_all" on storage.objects;
create policy "meter_photos_authenticated_all" on storage.objects
  for all to authenticated
  using      (bucket_id = 'meter-photos')
  with check (bucket_id = 'meter-photos');

-- Sanity check after running:
--   select id, public, file_size_limit from storage.buckets;
--   select column_name from information_schema.columns
--    where table_name in ('fuel_logs','work_orders','papers')
--      and column_name in ('receipt_path','invoice_path','doc_path');
