-- Create service_jobs table
create table if not exists public.service_jobs (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid references public.garage(id) on delete cascade not null,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  date timestamp with time zone not null,
  labour numeric(10, 2) not null default 0.00,
  total numeric(10, 2) not null default 0.00,
  notes text not null default '',
  payment_status text not null default 'PENDING',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  received_amount numeric(10, 2) not null default 0.00,
  remaining_amount numeric(10, 2) not null default 0.00,
  expected_payment_date timestamp with time zone,
  followup_reminder_date timestamp with time zone,
  payment_notes text,
  job_status text not null default 'Waiting',
  work_requested text not null default '',
  job_start_time timestamp with time zone,
  job_end_time timestamp with time zone,
  total_working_time integer not null default 0,
  pause_duration integer not null default 0,
  actual_working_duration integer not null default 0,
  timer_state text not null default 'STOPPED',
  last_timer_action_at timestamp with time zone,
  parts_total numeric(10, 2) not null default 0.00,
  parts_discount numeric(10, 2) not null default 0.00,
  labour_total numeric(10, 2) not null default 0.00,
  labour_discount numeric(10, 2) not null default 0.00,
  overall_discount numeric(10, 2) not null default 0.00,
  advance_received numeric(10, 2) not null default 0.00,
  previous_due_added numeric(10, 2) not null default 0.00,
  previous_due_bill_ids uuid[] default '{}',
  overall_discount_type text not null default 'FLAT',
  overall_discount_value numeric(10, 2) not null default 0.00,
  service_notes text,
  show_service_notes boolean default false
);

-- Enable RLS on service_jobs
alter table public.service_jobs enable row level security;

create policy "Owners can manage their service_jobs"
  on public.service_jobs for all
  using (garage_id = public.get_auth_garage_id())
  with check (garage_id = public.get_auth_garage_id());

-- Alter bill_items table
alter table public.bill_items alter column bill_id drop not null;
alter table public.bill_items add column if not exists job_id uuid references public.service_jobs(id) on delete cascade;

-- Alter services table
alter table public.services alter column bill_id drop not null;
alter table public.services add column if not exists job_id uuid references public.service_jobs(id) on delete cascade;

-- Alter payments table
alter table public.payments alter column bill_id drop not null;
alter table public.payments add column if not exists job_id uuid references public.service_jobs(id) on delete cascade;

-- Alter advances table
alter table public.advances alter column bill_id drop not null;
alter table public.advances add column if not exists job_id uuid references public.service_jobs(id) on delete cascade;

-- Alter job_timers table
alter table public.job_timers alter column bill_id drop not null;
alter table public.job_timers add column if not exists job_id uuid references public.service_jobs(id) on delete cascade;

-- Alter followups table
alter table public.followups alter column bill_id drop not null;
alter table public.followups add column if not exists job_id uuid references public.service_jobs(id) on delete cascade;
