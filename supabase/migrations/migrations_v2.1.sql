-- GarageBook v2.0 - Staff Type & Multi-Type Discount Upgrades

-- 1. Upgrade mechanics table
alter table public.mechanics add column if not exists work_type text not null default 'Salary' check (work_type in ('Salary', 'Independent'));
alter table public.mechanics add column if not exists commission_rate numeric(5, 2) not null default 0.00;

-- 2. Upgrade services table
alter table public.services add column if not exists mechanic_type text not null default 'Salary' check (mechanic_type in ('Salary', 'Independent'));
alter table public.services add column if not exists commission_rate numeric(5, 2) not null default 0.00;
alter table public.services add column if not exists working_time integer not null default 0; -- in seconds
alter table public.services add column if not exists start_time timestamp with time zone;
alter table public.services add column if not exists end_time timestamp with time zone;
alter table public.services add column if not exists discount_type text not null default 'FLAT' check (discount_type in ('FLAT', 'PERCENT'));
alter table public.services add column if not exists discount_value numeric(10, 2) not null default 0.00;

-- 3. Upgrade bills table
alter table public.bills add column if not exists overall_discount_type text not null default 'FLAT' check (overall_discount_type in ('FLAT', 'PERCENT'));
alter table public.bills add column if not exists overall_discount_value numeric(10, 2) not null default 0.00;

-- 4. Upgrade bill_items table
alter table public.bill_items add column if not exists discount_type text not null default 'PERCENT' check (discount_type in ('FLAT', 'PERCENT'));
alter table public.bill_items add column if not exists discount_value numeric(10, 2) not null default 0.00;

-- 5. Upgrade recalculate_bill_totals() trigger function to handle FLAT/PERCENT discounts
create or replace function public.recalculate_bill_totals()
returns trigger as $$
declare
  parts_sum numeric;
  parts_disc numeric;
  labour_sum numeric;
  labour_disc numeric;
  parts_net numeric;
  labour_net numeric;
  overall_disc_amount numeric;
  total_payments numeric;
  total_advances numeric;
begin
  -- Calculate parts base totals and discount totals
  select 
    coalesce(sum(unit_price * quantity), 0), 
    coalesce(sum(discount_amount), 0) 
  into parts_sum, parts_disc 
  from public.bill_items 
  where bill_id = new.id;

  -- Calculate labour charges and discounts
  select 
    coalesce(sum(labour_charge), 0), 
    coalesce(sum(discount), 0) 
  into labour_sum, labour_disc 
  from public.services 
  where bill_id = new.id;

  parts_net := parts_sum - parts_disc;
  labour_net := labour_sum - labour_disc;

  -- Calculate overall discount amount based on type
  if new.overall_discount_type = 'PERCENT' then
    overall_disc_amount := (parts_net + labour_net) * (coalesce(new.overall_discount_value, 0) / 100);
  else
    overall_disc_amount := coalesce(new.overall_discount_value, 0);
  end if;

  -- Calculate payments and advances sum
  select coalesce(sum(amount), 0) into total_payments 
  from public.payments 
  where bill_id = new.id;

  select coalesce(sum(amount), 0) into total_advances 
  from public.advances 
  where bill_id = new.id;

  new.parts_total := parts_sum;
  new.parts_discount := parts_disc;
  new.labour_total := labour_sum;
  new.labour_discount := labour_disc;
  new.advance_received := total_advances;
  new.received_amount := total_payments + total_advances;
  new.overall_discount := overall_disc_amount;

  -- Overall Payable Total = Parts Net + Labour Net - Overall Discount Amount + Previous Dues Added
  new.total := parts_net + labour_net - overall_disc_amount + coalesce(new.previous_due_added, 0);
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
