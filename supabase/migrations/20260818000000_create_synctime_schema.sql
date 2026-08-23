-- SyncTime Version 1 schema
-- Run through the Supabase CLI or paste into the SQL editor for a new project.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  pay_period text not null check (pay_period in ('first_half', 'second_half')),
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timesheets_unique_period unique (user_id, year, month, pay_period),
  constraint timesheets_submission_consistency check (
    (status = 'draft' and submitted_at is null)
    or (status = 'submitted' and submitted_at is not null)
  )
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  entry_date date not null,
  regular_hours numeric(6, 2) not null default 0 check (regular_hours >= 0),
  holiday_hours numeric(6, 2) not null default 0 check (holiday_hours >= 0),
  sick_hours numeric(6, 2) not null default 0 check (sick_hours >= 0),
  vacation_hours numeric(6, 2) not null default 0 check (vacation_hours >= 0),
  overtime_hours numeric(6, 2) not null default 0 check (overtime_hours >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_unique_date unique (timesheet_id, entry_date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_submission_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'draft' then
    new.submitted_at = null;
  elsif tg_op = 'INSERT' then
    new.submitted_at = now();
  elsif old.status is distinct from 'submitted' then
    new.submitted_at = now();
  else
    new.submitted_at = old.submitted_at;
  end if;
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger timesheets_set_updated_at
before update on public.timesheets
for each row execute function public.set_updated_at();

create trigger timesheets_set_submission_timestamp
before insert or update on public.timesheets
for each row execute function public.set_submission_timestamp();

create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.timesheets enable row level security;
alter table public.time_entries enable row level security;

-- Employees may create, read, and update only the profile tied to auth.uid().
create policy "Employees can read their profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Employees can create their profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Employees can update their profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Employees may create, read, and update only timesheets they own.
create policy "Employees can read their timesheets"
on public.timesheets for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Employees can create their timesheets"
on public.timesheets for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Employees can update their timesheets"
on public.timesheets for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Entry access is inherited from ownership of the parent timesheet.
create policy "Employees can read their time entries"
on public.time_entries for select
to authenticated
using (
  exists (
    select 1 from public.timesheets
    where timesheets.id = time_entries.timesheet_id
      and timesheets.user_id = (select auth.uid())
  )
);

create policy "Employees can create their time entries"
on public.time_entries for insert
to authenticated
with check (
  exists (
    select 1 from public.timesheets
    where timesheets.id = time_entries.timesheet_id
      and timesheets.user_id = (select auth.uid())
      and timesheets.status = 'draft'
  )
);

create policy "Employees can update their time entries"
on public.time_entries for update
to authenticated
using (
  exists (
    select 1 from public.timesheets
    where timesheets.id = time_entries.timesheet_id
      and timesheets.user_id = (select auth.uid())
      and timesheets.status = 'draft'
  )
)
with check (
  exists (
    select 1 from public.timesheets
    where timesheets.id = time_entries.timesheet_id
      and timesheets.user_id = (select auth.uid())
      and timesheets.status = 'draft'
  )
);

grant usage on schema public to authenticated;
revoke all on public.profiles from anon;
revoke all on public.timesheets from anon;
revoke all on public.time_entries from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.timesheets to authenticated;
grant select, insert, update on public.time_entries to authenticated;
