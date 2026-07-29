-- GarageBook v2.0 Database Migration File
-- Upgrades schema to support open service queue status, labor entries tracking, job timers, advance payments, dues, and imports

-- 1. Create service_suggestions table
create table if not exists public.service_suggestions (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  name text not null,
  charge numeric(10, 2) not null default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_service_suggestion unique (garage_id, name)
);

create index if not exists idx_service_suggestions_garage_id on public.service_suggestions(garage_id);
alter table public.service_suggestions enable row level security;

create policy "Owners can manage their service suggestions"
  on public.service_suggestions for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 2. Upgrade bills table columns
alter table public.bills add column if not exists job_status text not null default 'Waiting' check (job_status in ('Waiting', 'Assigned', 'Work Started', 'Waiting for Parts', 'Completed', 'Delivered'));
alter table public.bills add column if not exists work_requested text not null default '';
alter table public.bills add column if not exists job_start_time timestamp with time zone;
alter table public.bills add column if not exists job_end_time timestamp with time zone;
alter table public.bills add column if not exists total_working_time integer not null default 0; -- in seconds
alter table public.bills add column if not exists pause_duration integer not null default 0; -- in seconds
alter table public.bills add column if not exists actual_working_duration integer not null default 0; -- in seconds
alter table public.bills add column if not exists timer_state text not null default 'STOPPED' check (timer_state in ('STOPPED', 'RUNNING', 'PAUSED', 'COMPLETED'));
alter table public.bills add column if not exists last_timer_action_at timestamp with time zone;

alter table public.bills add column if not exists parts_total numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists parts_discount numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists labour_total numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists labour_discount numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists overall_discount numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists advance_received numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists previous_due_added numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists previous_due_bill_ids uuid[] default '{}';

-- 3. Create services (Labour items) table
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  bill_id uuid references public.bills(id) on delete cascade not null,
  name text not null,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  labour_charge numeric(10, 2) not null default 0.00,
  discount numeric(10, 2) not null default 0.00,
  final_charge numeric(10, 2) not null default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_services_garage_id on public.services(garage_id);
create index if not exists idx_services_bill_id on public.services(bill_id);
alter table public.services enable row level security;

create policy "Owners can manage their services"
  on public.services for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 4. Upgrade bill_items (Parts) table columns
alter table public.bill_items add column if not exists quantity integer not null default 1;
alter table public.bill_items add column if not exists unit_price numeric(10, 2) not null default 0.00;
alter table public.bill_items add column if not exists discount_percentage numeric(5, 2) not null default 0.00;
alter table public.bill_items add column if not exists discount_amount numeric(10, 2) not null default 0.00;
alter table public.bill_items add column if not exists final_price numeric(10, 2) not null default 0.00;

-- 5. Create advances table
create table if not exists public.advances (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  bill_id uuid references public.bills(id) on delete cascade not null,
  amount numeric(10, 2) not null default 0.00,
  payment_mode text not null check (payment_mode in ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_advances_garage_id on public.advances(garage_id);
create index if not exists idx_advances_bill_id on public.advances(bill_id);
alter table public.advances enable row level security;

create policy "Owners can manage their advances"
  on public.advances for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 6. Create job_timers log table
create table if not exists public.job_timers (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  bill_id uuid references public.bills(id) on delete cascade not null,
  action text not null check (action in ('START', 'PAUSE', 'RESUME', 'COMPLETE')),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_job_timers_garage_id on public.job_timers(garage_id);
create index if not exists idx_job_timers_bill_id on public.job_timers(bill_id);
alter table public.job_timers enable row level security;

create policy "Owners can manage their job timers"
  on public.job_timers for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 7. Create manual_imports table
create table if not exists public.manual_imports (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  customer_name text not null,
  phone text not null,
  vehicle_number text not null,
  bill_date timestamp with time zone not null,
  amount numeric(10, 2) not null default 0.00,
  paid_amount numeric(10, 2) not null default 0.00,
  pending_amount numeric(10, 2) not null default 0.00,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_manual_imports_garage_id on public.manual_imports(garage_id);
create index if not exists idx_manual_imports_phone on public.manual_imports(phone);
create index if not exists idx_manual_imports_vehicle on public.manual_imports(vehicle_number);
alter table public.manual_imports enable row level security;

create policy "Owners can manage their manual imports"
  on public.manual_imports for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 8. Create followups table (expanded for debts)
create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  bill_id uuid references public.bills(id) on delete cascade not null,
  followup_date timestamp with time zone not null,
  notes text,
  status text not null default 'PENDING' check (status in ('PENDING', 'COMPLETED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_followups_garage_id on public.followups(garage_id);
create index if not exists idx_followups_bill_id on public.followups(bill_id);
alter table public.followups enable row level security;

create policy "Owners can manage their followups"
  on public.followups for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 9. Upgraded Recalculate Bill Totals function & triggers
create or replace function public.recalculate_bill_totals()
returns trigger as $$
declare
  parts_sum numeric;
  parts_disc numeric;
  labour_sum numeric;
  labour_disc numeric;
  total_payments numeric;
  total_advances numeric;
begin
  -- Calculate parts totals
  select 
    coalesce(sum(unit_price * quantity), 0), 
    coalesce(sum(discount_amount), 0) 
  into parts_sum, parts_disc 
  from public.bill_items 
  where bill_id = new.id;

  -- Calculate labour totals
  select 
    coalesce(sum(labour_charge), 0), 
    coalesce(sum(discount), 0) 
  into labour_sum, labour_disc 
  from public.services 
  where bill_id = new.id;

  -- Calculate payments sum
  select coalesce(sum(amount), 0) into total_payments 
  from public.payments 
  where bill_id = new.id;

  -- Calculate advances sum
  select coalesce(sum(amount), 0) into total_advances 
  from public.advances 
  where bill_id = new.id;

  new.parts_total := parts_sum;
  new.parts_discount := parts_disc;
  new.labour_total := labour_sum;
  new.labour_discount := labour_disc;
  new.advance_received := total_advances;
  new.received_amount := total_payments + total_advances;

  -- Overall Total = (Parts Base - Parts Disc) + (Labour Base - Labour Disc) - Overall Disc + Previous Due
  new.total := (parts_sum - parts_disc) + (labour_sum - labour_disc) - coalesce(new.overall_discount, 0) + coalesce(new.previous_due_added, 0);
  new.remaining_amount := new.total - new.received_amount;

  if new.received_amount >= new.total then
    new.payment_status := 'PAID';
  elsif new.received_amount > 0 then
    new.payment_status := 'PARTIAL';
  else
    new.payment_status := 'PENDING';
  end if;

  return new;
end;
$$ language plpgsql;

-- 10. Update cascade trigger for services change
create or replace function public.trigger_bill_recalculate_v2()
returns trigger as $$
begin
  update public.bills
  set updated_at = timezone('utc'::text, now())
  where id = coalesce(new.bill_id, old.bill_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_service_change on public.services;
create trigger on_service_change
after insert or update or delete on public.services
for each row execute procedure public.trigger_bill_recalculate_v2();

drop trigger if exists on_advance_change on public.advances;
create trigger on_advance_change
after insert or update or delete on public.advances
for each row execute procedure public.trigger_bill_recalculate_v2();

-- Also ensure bill items insert updates totals
drop trigger if exists on_bill_item_change on public.bill_items;
create trigger on_bill_item_change
after insert or update or delete on public.bill_items
for each row execute procedure public.trigger_bill_recalculate_v2();
