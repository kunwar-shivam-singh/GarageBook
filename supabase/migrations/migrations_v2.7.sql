-- Upgrade mechanics table to support salary
alter table public.mechanics add column if not exists salary numeric(10, 2) not null default 0.00;
