-- ============================================
-- DISABLE RLS ON ALL PUBLIC TABLES
-- ============================================
-- The FleetPro app enforces access control client-side via role checks
-- (Super Admin / Fleet Manager / Store Staff / Viewer). RLS was getting
-- enabled by default on some tables (Supabase Dashboard turns it on for
-- new tables created through the UI), which then blocked legitimate writes.
--
-- This sweep disables RLS on every table in the public schema, matching
-- the existing posture and preventing future "row violates RLS policy"
-- errors from popping up on tables we haven't touched yet.
--
-- Run this in Supabase SQL Editor. Safe to re-run (idempotent).
-- ============================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY;', r.schemaname, r.tablename);
  END LOOP;
END$$;

-- Verify (this SELECT shows any table still with RLS enabled — should return 0 rows after the DO block)
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
