-- One profile per authenticated account. Existing plan preferences remain unchanged.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  tracking_preference text
    check (tracking_preference in ('purchases', 'balance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Owner-only access policies will be added in the next step.
alter table public.profiles enable row level security;

-- updated_at currently records creation time; updates need explicit handling.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

-- Read
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Add
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

-- Update
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());