-- Supabase/PostgreSQL Database Schema for GarageBook

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Garage Settings Table (Always maximum 1 row)
create table if not exists garage_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'GarageBook Demo',
  logo text default '', -- Base64 encoded logo string or URL
  owner_name text not null default 'Owner Name',
  phone text not null default '0000000000',
  address text not null default 'Garage Address',
  footer_message text not null default 'Thank you for your business!',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default settings if empty
insert into garage_settings (name, owner_name, phone, address, footer_message)
values ('My Motorcycle Garage', 'John Doe', '9876543210', '123 Main Street, City', 'We service all models. Thank you!')
on conflict do nothing;

-- 2. Customers Table
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast phone number lookups
create index if not exists idx_customers_phone on customers(phone);

-- 3. Vehicles Table
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_number text not null unique,
  brand text not null,
  model text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for vehicles
create index if not exists idx_vehicles_customer_id on vehicles(customer_id);
create index if not exists idx_vehicles_number on vehicles(vehicle_number);

-- 4. Bills Table
create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  invoice_number text not null unique,
  date timestamp with time zone not null,
  labour numeric(10, 2) not null default 0.00,
  total numeric(10, 2) not null default 0.00,
  notes text,
  payment_status text not null check (payment_status in ('PAID', 'PENDING')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_bills_vehicle_id on bills(vehicle_id);
create index if not exists idx_bills_customer_id on bills(customer_id);
create index if not exists idx_bills_invoice_number on bills(invoice_number);

-- 5. Bill Items Table
create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  name text not null,
  price numeric(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_bill_items_bill_id on bill_items(bill_id);

-- 6. Part Suggestions Table
create table if not exists part_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_part_suggestions_name on part_suggestions(name);
