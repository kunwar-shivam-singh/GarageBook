-- Add service notes fields to bills table
alter table public.bills add column if not exists service_notes text not null default '';
alter table public.bills add column if not exists show_service_notes boolean not null default true;

-- Add custom branding fields to garage table
alter table public.garage add column if not exists warranty_notes text not null default '';
alter table public.garage add column if not exists whatsapp_number text not null default '';
alter table public.garage add column if not exists social_media text not null default '';
