-- GarageBook v1.1 Database Migration File
-- Upgrades schema to support mechanics, split payments, follow-up dates, and automatic status calculations

-- 1. Create mechanics table
create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_garage_mechanic_name unique (garage_id, name)
);

create index if not exists idx_mechanics_garage_id on public.mechanics(garage_id);
alter table public.mechanics enable row level security;

create policy "Owners can manage their mechanics"
  on public.mechanics for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 2. Upgrade bills table columns
alter table public.bills add column if not exists mechanic_id uuid references public.mechanics(id) on delete set null;
alter table public.bills add column if not exists received_amount numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists remaining_amount numeric(10, 2) not null default 0.00;
alter table public.bills add column if not exists expected_payment_date timestamp with time zone;
alter table public.bills add column if not exists followup_reminder_date timestamp with time zone;
alter table public.bills add column if not exists payment_notes text;
alter table public.bills add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Drop old check constraint and add upgraded check constraint for payment_status
alter table public.bills drop constraint if exists bills_payment_status_check;
alter table public.bills add constraint bills_payment_status_check check (payment_status in ('PAID', 'PARTIAL', 'PENDING'));

-- 3. Create payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  bill_id uuid references public.bills(id) on delete cascade not null,
  payment_method text not null check (payment_method in ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CREDIT', 'OTHER')),
  amount numeric(10, 2) not null default 0.00,
  payment_date timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_payments_garage_id on public.payments(garage_id);
create index if not exists idx_payments_bill_id on public.payments(bill_id);
alter table public.payments enable row level security;

create policy "Owners can manage their payments"
  on public.payments for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- 4. Set up auto-calculation triggers on bills
create or replace function public.recalculate_bill_totals()
returns trigger as $$
declare
  total_paid numeric;
begin
  -- Sum all payments for this bill
  select coalesce(sum(amount), 0) into total_paid 
  from public.payments 
  where bill_id = new.id;

  new.received_amount := total_paid;
  new.remaining_amount := new.total - total_paid;

  if total_paid >= new.total then
    new.payment_status := 'PAID';
  elsif total_paid > 0 then
    new.payment_status := 'PARTIAL';
  else
    new.payment_status := 'PENDING';
  end if;

  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists before creating to prevent duplicate error
drop trigger if exists on_bill_update_totals on public.bills;
create trigger on_bill_update_totals
before insert or update on public.bills
for each row execute procedure public.recalculate_bill_totals();

-- 5. Trigger on payment change to update target bill
create or replace function public.trigger_bill_recalculate()
returns trigger as $$
begin
  update public.bills
  set updated_at = timezone('utc'::text, now())
  where id = coalesce(new.bill_id, old.bill_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_payment_change on public.payments;
create trigger on_payment_change
after insert or update or delete on public.payments
for each row execute procedure public.trigger_bill_recalculate();
