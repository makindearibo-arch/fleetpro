-- =============================================================================
-- ALLOW THE NEW ROLES ON USER PROFILES (2026-10-27).
-- =============================================================================
-- profiles.role has a CHECK constraint (profiles_role_check, created outside these
-- migration files) that only allowed the original four roles, so choosing Audit,
-- HQ Accounts or Senior Manager in Settings -> Users failed with
--   new row for relation "profiles" violates check constraint "profiles_role_check".
-- Widen it to the seven roles the app uses (20261027_imprest.sql). Every existing
-- profile already uses one of the original four.
-- Safe to re-run.
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('Super Admin', 'Fleet Manager', 'Store Staff', 'Viewer',
                  'Audit', 'HQ Accounts', 'Senior Manager'));

-- PROOF: expect  true | 0
select (select pg_get_constraintdef(oid) like '%Senior Manager%' from pg_constraint
          where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass) as new_roles_allowed,
       (select count(*) from public.profiles
          where role not in ('Super Admin', 'Fleet Manager', 'Store Staff', 'Viewer',
                             'Audit', 'HQ Accounts', 'Senior Manager')) as profiles_with_other_roles;
