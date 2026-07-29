-- GarageBook v1.0 Database Migration File
-- Enables multi-tenancy, indexes, foreign keys, triggers, and Row Level Security (RLS)

-- 1. Create Garage Settings Table
create table if not exists public.garage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade unique not null,
  name text not null default 'My Motorcycle Garage',
  logo text not null default '', -- Base64 encoded logo image or URL
  owner_name text not null default 'Owner Name',
  phone text not null default '9876543210',
  address text not null default '123 Main Street, Garage Lane, Auto City',
  footer_message text not null default 'Thank you for choosing us! Keep riding safe.',
  gst_number text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for owner checks
create index if not exists idx_garage_owner_id on public.garage(owner_id);

-- 2. Helper function to retrieve the active user's garage ID
create or replace function public.get_auth_garage_id() 
returns uuid security definer as $$
  select id from public.garage where owner_id = auth.uid() limit 1;
$$ language sql;

-- 3. Customers Table (with unique phone per garage)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  name text not null,
  phone text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_customer_phone unique (garage_id, phone)
);

create index if not exists idx_customers_garage_id on public.customers(garage_id);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_name on public.customers(name);

-- 4. Vehicles Table (with unique vehicle number per garage)
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  vehicle_number text not null,
  brand text not null,
  model text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_vehicle_number unique (garage_id, vehicle_number)
);

create index if not exists idx_vehicles_garage_id on public.vehicles(garage_id);
create index if not exists idx_vehicles_customer_id on public.vehicles(customer_id);
create index if not exists idx_vehicles_number on public.vehicles(vehicle_number);

-- 5. Bills Table (with unique invoice number per garage)
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  invoice_number text not null,
  date timestamp with time zone not null,
  labour numeric(10, 2) not null default 0.00,
  total numeric(10, 2) not null default 0.00,
  notes text not null default '',
  payment_status text not null check (payment_status in ('PAID', 'PENDING')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_invoice_number unique (garage_id, invoice_number)
);

create index if not exists idx_bills_garage_id on public.bills(garage_id);
create index if not exists idx_bills_vehicle_id on public.bills(vehicle_id);
create index if not exists idx_bills_customer_id on public.bills(customer_id);
create index if not exists idx_bills_invoice_number on public.bills(invoice_number);

-- 6. Bill Items Table
create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  bill_id uuid references public.bills(id) on delete cascade not null,
  name text not null,
  price numeric(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_bill_items_garage_id on public.bill_items(garage_id);
create index if not exists idx_bill_items_bill_id on public.bill_items(bill_id);

-- 7. Part Suggestions Table (with unique part name per garage)
create table if not exists public.part_suggestions (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  name text not null,
  price numeric(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_part_suggestion unique (garage_id, name)
);

create index if not exists idx_part_suggestions_garage_id on public.part_suggestions(garage_id);
create index if not exists idx_part_suggestions_name on public.part_suggestions(name);


-- 8. Enable Row Level Security (RLS) on all tables
alter table public.garage enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.part_suggestions enable row level security;


-- 9. Row Level Security Policies

-- Garage profile policies
create policy "Owners can view their own garage profile" 
  on public.garage for select 
  using (auth.uid() = owner_id);

create policy "Owners can update their own garage profile" 
  on public.garage for update 
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can create their own garage profile" 
  on public.garage for insert 
  with check (auth.uid() = owner_id);

-- Customers policies
create policy "Owners can manage their customers"
  on public.customers for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- Vehicles policies
create policy "Owners can manage their vehicles"
  on public.vehicles for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- Bills policies
create policy "Owners can manage their bills"
  on public.bills for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- Bill items policies
create policy "Owners can manage their bill items"
  on public.bill_items for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- Part suggestions policies
create policy "Owners can manage their part suggestions"
  on public.part_suggestions for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());


-- 10. Triggers to automatically create a Garage Settings row for new Auth Signups
create or replace function public.handle_new_auth_user()
returns trigger security definer as $$
begin
  insert into public.garage (owner_id, name, owner_name, phone, address, footer_message)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'garage_name', 'My Motorcycle Garage'),
    coalesce(new.raw_user_meta_data->>'name', 'Owner Name'),
    coalesce(new.phone, '9876543210'),
    'Garage Address',
    'Thank you for your business! Ride safe!'
  );
  return new;
end;
$$ language plpgsql;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
