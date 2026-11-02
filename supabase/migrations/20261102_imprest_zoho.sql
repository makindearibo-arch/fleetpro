-- =============================================================================
-- IMPREST -> ZOHO BOOKS JOURNALS (2026-11-02), like the DRS branch imprest.
-- =============================================================================
-- Accounts' rules for the fleet (admin) imprest:
--   Journal 1  each time HQ Accounts gives the fleet office cash (one per handover)
--                Dr Petty cash imprest admin      Cr Operational imprest
--   Journal 2  each week, once the voucher has its final approval (what was spent)
--                Dr each line's expense account   Cr Petty cash imprest admin
--              (the "owed from last week" line is left out: that spending already went
--               through Zoho in last week's Journal 2)
-- The journals are built and sent by the server (api/imprest-zoho.js, Zoho Books login
-- in Vercel's server environment), which reads the amounts from these tables, never
-- from the browser. It keeps the Zoho journal id + number here, so sending again
-- UPDATES the same journal instead of making a second one.
--
--   imprest_cash.zoho / imprest_vouchers.zoho   {id, number, amount, date, notes, inputtedBy, at, by, updates}
--   *.zoho_lock                                  set while a post is in progress (two clicks -> one journal)
-- Only the server (service key) may write them. Cash already in Zoho cannot be deleted here.
-- The Zoho accounts to use are chosen once by the Super Admin (Settings -> Zoho Books),
-- saved in app_settings 'zoho_imprest'.
--
-- Safe to re-run.
-- =============================================================================

alter table public.imprest_cash     add column if not exists zoho jsonb;
alter table public.imprest_cash     add column if not exists zoho_lock timestamptz;
alter table public.imprest_vouchers add column if not exists zoho jsonb;
alter table public.imprest_vouchers add column if not exists zoho_lock timestamptz;
-- the posting service uses the service key (Supabase grants this by default; made explicit)
grant select, update on public.imprest_cash, public.imprest_vouchers to service_role;

create or replace function public.fp_guard_imprest_zoho() returns trigger
language plpgsql as $$
begin
  if public.fp_is_backend() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if tg_table_name = 'imprest_cash' and old.zoho is not null then
      raise exception 'This cash is already in Zoho Books (journal %), so it cannot be removed in FleetPro.', coalesce(old.zoho ->> 'number', old.zoho ->> 'id');
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.zoho is not null or new.zoho_lock is not null then
      raise exception 'Only the Zoho posting service records Zoho journals.';
    end if;
    return new;
  end if;
  if new.zoho is distinct from old.zoho or new.zoho_lock is distinct from old.zoho_lock then
    raise exception 'Only the Zoho posting service records Zoho journals.';
  end if;
  return new;
end $$;

drop trigger if exists fp_guard_imprest_zoho on public.imprest_cash;
create trigger fp_guard_imprest_zoho before insert or update or delete on public.imprest_cash
  for each row execute function public.fp_guard_imprest_zoho();
drop trigger if exists fp_guard_imprest_zoho on public.imprest_vouchers;
create trigger fp_guard_imprest_zoho before insert or update or delete on public.imprest_vouchers
  for each row execute function public.fp_guard_imprest_zoho();

-- PROOF: expect  4 | 2
select (select count(*) from information_schema.columns where table_schema = 'public'
          and table_name in ('imprest_cash', 'imprest_vouchers') and column_name in ('zoho', 'zoho_lock')) as zoho_columns,
       (select count(*) from pg_trigger where tgname = 'fp_guard_imprest_zoho') as zoho_guards;
