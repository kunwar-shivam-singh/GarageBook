-- Drop old job status check constraint and add upgraded check constraint to support new workshop operations statuses
alter table public.bills drop constraint if exists bills_job_status_check;

alter table public.bills add constraint bills_job_status_check check (
  job_status in (
    'Waiting', 
    'Assigned', 
    'Working', 
    'Ready for Delivery', 
    'Delivered', 
    'Cancelled',
    'Work Started', 
    'Waiting for Parts', 
    'Completed'
  )
);
