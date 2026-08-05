-- Upgrade recalculate_bill_totals() trigger function to calculate totals exactly like service_jobs
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

  -- Calculate total payments (which includes the advance payment)
  select coalesce(sum(amount), 0) into total_payments 
  from public.payments 
  where bill_id = new.id;

  -- Calculate total advances from payments table with note 'Advance'
  select coalesce(sum(amount), 0) into total_advances 
  from public.payments 
  where bill_id = new.id and (notes = 'Advance' or notes = 'Advance payment');

  new.parts_total := parts_sum;
  new.parts_discount := parts_disc;
  new.labour_total := labour_sum;
  new.labour_discount := labour_disc;
  new.advance_received := total_advances;
  new.received_amount := total_payments;
  new.overall_discount := overall_disc_amount;

  -- Overall Payable Total = Parts Net + Labour Net - Overall Discount Amount + Previous Dues Added
  new.total := parts_net + labour_net - overall_disc_amount + coalesce(new.previous_due_added, 0);
  new.remaining_amount := new.total - total_payments;
  
  if total_payments >= new.total then
    new.payment_status := 'PAID';
  elsif total_payments > 0 then
    new.payment_status := 'PARTIAL';
  else
    new.payment_status := 'PENDING';
  end if;

  return new;
end;
$$ language plpgsql;


-- Add updated_at column to service_jobs if it doesn't exist, safely
do $$ 
begin
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'service_jobs' 
                 and column_name = 'updated_at') then
    alter table public.service_jobs add column updated_at timestamp with time zone default timezone('utc'::text, now());
  end if;
end $$;

-- Create an RPC to safely convert a service job into a bill in an atomic transaction
create or replace function public.deliver_vehicle_atomic(
  p_job_id uuid,
  p_invoice_number text
)
returns public.bills as $$
declare
  job_record public.service_jobs%rowtype;
  new_bill public.bills%rowtype;
begin
  -- Fetch the job
  select * into job_record from public.service_jobs where id = p_job_id;
  if not found then
    raise exception 'Job not found';
  end if;

  -- 1. Insert into bills
  insert into public.bills (
    id,
    garage_id,
    vehicle_id,
    customer_id,
    invoice_number,
    date,
    labour,
    total,
    notes,
    payment_status,
    mechanic_id,
    received_amount,
    remaining_amount,
    expected_payment_date,
    followup_reminder_date,
    payment_notes,
    job_status,
    work_requested,
    job_start_time,
    job_end_time,
    total_working_time,
    pause_duration,
    actual_working_duration,
    timer_state,
    last_timer_action_at,
    parts_total,
    parts_discount,
    labour_total,
    labour_discount,
    overall_discount,
    advance_received,
    previous_due_added,
    previous_due_bill_ids,
    overall_discount_type,
    overall_discount_value,
    service_notes,
    show_service_notes
  ) values (
    job_record.id,
    job_record.garage_id,
    job_record.vehicle_id,
    job_record.customer_id,
    p_invoice_number,
    timezone('utc'::text, now()),
    job_record.labour,
    job_record.total,
    job_record.notes,
    job_record.payment_status,
    job_record.mechanic_id,
    job_record.received_amount,
    job_record.remaining_amount,
    job_record.expected_payment_date,
    job_record.followup_reminder_date,
    job_record.payment_notes,
    'Delivered',
    job_record.work_requested,
    job_record.job_start_time,
    coalesce(job_record.job_end_time, timezone('utc'::text, now())),
    job_record.total_working_time,
    job_record.pause_duration,
    job_record.actual_working_duration,
    'COMPLETED',
    timezone('utc'::text, now()),
    job_record.parts_total,
    job_record.parts_discount,
    job_record.labour_total,
    job_record.labour_discount,
    job_record.overall_discount,
    job_record.advance_received,
    job_record.previous_due_added,
    job_record.previous_due_bill_ids,
    job_record.overall_discount_type,
    job_record.overall_discount_value,
    job_record.service_notes,
    job_record.show_service_notes
  ) returning * into new_bill;

  -- 2. Reparent child tables safely
  update public.bill_items set bill_id = job_record.id, job_id = null where job_id = p_job_id;
  update public.services set bill_id = job_record.id, job_id = null where job_id = p_job_id;
  update public.payments set bill_id = job_record.id, job_id = null where job_id = p_job_id;
  update public.advances set bill_id = job_record.id, job_id = null where job_id = p_job_id;
  update public.job_timers set bill_id = job_record.id, job_id = null where job_id = p_job_id;
  update public.followups set bill_id = job_record.id, job_id = null where job_id = p_job_id;

  -- 3. Delete the original service job
  delete from public.service_jobs where id = p_job_id;

  -- The BEFORE/AFTER UPDATE triggers on bills and child tables will fire 
  -- and recalculate totals automatically now that children are reparented.

  -- Re-fetch the fully updated bill
  select * into new_bill from public.bills where id = p_job_id;

  return new_bill;
end;
$$ language plpgsql;
