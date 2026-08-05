-- Upgrade recalculate_bill_totals() trigger function to correctly calculate advances from BOTH the advances table AND legacy payments table
create or replace function public.recalculate_bill_totals()
returns trigger as $$
declare
  parts_sum numeric;
  parts_disc numeric;
  parts_net numeric;
  labour_sum numeric;
  labour_disc numeric;
  labour_net numeric;
  overall_disc_amount numeric;
  total_payments numeric;
  total_advances_from_advances numeric;
  total_advances_from_payments numeric;
  total_advances numeric;
begin
  -- Calculate parts base totals and discount totals, and final net
  -- We now use final_price directly for the net, just like service_jobs
  select 
    coalesce(sum(unit_price * quantity), 0), 
    coalesce(sum(discount_amount), 0),
    coalesce(sum(final_price), 0)
  into parts_sum, parts_disc, parts_net
  from public.bill_items 
  where bill_id = new.id;

  -- Calculate labour charges and discounts, and final net
  select 
    coalesce(sum(labour_charge), 0), 
    coalesce(sum(discount), 0),
    coalesce(sum(final_charge), 0)
  into labour_sum, labour_disc, labour_net
  from public.services 
  where bill_id = new.id;

  -- Calculate overall discount amount based on type
  if new.overall_discount_type = 'PERCENT' then
    overall_disc_amount := (parts_net + labour_net) * (coalesce(new.overall_discount_value, 0) / 100);
  else
    overall_disc_amount := coalesce(new.overall_discount_value, 0);
  end if;

  -- Calculate total payments (excluding advances)
  select coalesce(sum(amount), 0) into total_payments 
  from public.payments 
  where bill_id = new.id and (notes != 'Advance' and notes != 'Advance payment' or notes is null);

  -- 1. Calculate advances strictly from the advances table (Standard Workflow)
  select coalesce(sum(amount), 0) into total_advances_from_advances
  from public.advances
  where bill_id = new.id;

  -- 2. Calculate advances from payments table with note 'Advance' (Legacy Fallback)
  select coalesce(sum(amount), 0) into total_advances_from_payments
  from public.payments 
  where bill_id = new.id and (notes = 'Advance' or notes = 'Advance payment');

  total_advances := total_advances_from_advances + total_advances_from_payments;

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
