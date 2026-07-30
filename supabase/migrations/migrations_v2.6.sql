-- Alter garage settings table to add mechanic_mode
alter table public.garage add column if not exists mechanic_mode text not null default 'Mixed';

-- Create vehicle_suggestions table
create table if not exists public.vehicle_suggestions (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  brand text not null,
  model text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_vehicle_suggestion unique (garage_id, brand, model)
);

alter table public.vehicle_suggestions enable row level security;

create policy "Owners can manage their vehicle_suggestions"
  on public.vehicle_suggestions for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- Create complaint_suggestions table
create table if not exists public.complaint_suggestions (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_complaint_suggestion unique (garage_id, name)
);

alter table public.complaint_suggestions enable row level security;

create policy "Owners can manage their complaint_suggestions"
  on public.complaint_suggestions for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());
