-- ============================================================================
-- HOUR METERS THAT COUNT IN THOUSANDS OF HOURS (2026-11-04, Makinde).
-- ============================================================================
-- Akure 4's generator panel shows "15.79 Kh" = about 15,790 hours and only
-- moves in steps of 0.01 = 10 hours of running, so most days show no change
-- and one day jumps 10 hours. The daily check read 0.01 as 0.01 hours: every
-- day the meter moved was flagged for that day's whole diesel use (10 false
-- flags Jul-Nov 2026) and the days between were never checked at all.
--
-- generators.meter_unit   'h'   the panel counts hours (default, every other generator)
--                         'kh'  the panel counts thousands of hours
--
-- Staff keep typing what the panel shows; the app turns it into hours (x 1000)
-- and checks such a generator month by month instead of day by day (App.jsx
-- khMonths). Store staff cannot change meter_unit: fp_guard_generator lets them
-- change only hrs. Managers set it in Generators -> Edit -> "Hour meter counts in".
--
-- This migration also marks Akure 4's generator 'kh' and clears the daily
-- flags/gaps its readings carry (a note is added to each flagged one).
-- Safe to re-run.
-- ============================================================================

alter table public.generators add column if not exists meter_unit text not null default 'h';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.generators'::regclass and conname = 'generators_meter_unit_check') then
    alter table public.generators add constraint generators_meter_unit_check check (meter_unit in ('h', 'kh'));
  end if;
end $$;

-- Akure 4 Generator
update public.generators set meter_unit = 'kh'
 where id = '47b70ec7-f7e0-4fa4-9d88-b6dcb731f418' and meter_unit <> 'kh';

-- its daily flags were "the meter moved 10 hours today", not diesel unaccounted for
update public.diesel_readings
   set notes = trim(coalesce(notes, '') || case when discrepancy_flag
         then ' [2026-11-04 admin fix: daily flag cleared - this generator''s hour meter counts in thousands of hours (10-hour steps), so it is checked month by month]'
         else '' end),
       discrepancy_flag = false,
       discrepancy_litres = null
 where generator_id in (select id from public.generators where meter_unit = 'kh')
   and (discrepancy_flag or discrepancy_litres is not null);

-- Proof it took (expect one row: akure4_meter = kh | kh_daily_flags_left = 0):
select
  (select meter_unit from public.generators where id = '47b70ec7-f7e0-4fa4-9d88-b6dcb731f418') as akure4_meter,
  (select count(*) from public.diesel_readings r join public.generators g on g.id = r.generator_id
    where g.meter_unit = 'kh' and (r.discrepancy_flag or r.discrepancy_litres is not null)) as kh_daily_flags_left;
