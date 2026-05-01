-- DentLink - Initial Schema
-- Run this in your Supabase SQL editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Dentists table
create table if not exists dentists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  clinic text not null default '',
  phone text not null default '',
  email text default '',
  address text default '',
  city text default 'Casablanca',
  balance decimal(10,2) default 0,
  lab_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  dentist_id uuid references dentists(id) on delete set null,
  patient_name text not null,
  work_type text not null check (work_type in ('crown','bridge','denture','implant','veneer','inlay','night_guard','retainer','other')),
  material text not null check (material in ('metal_ceramic','full_ceramic','zirconia','resin','metal','composite','other')),
  shade text default '',
  tooth_numbers text default '',
  received_date date default current_date,
  due_date date not null,
  delivery_date date,
  status text default 'pending' check (status in ('pending','in_progress','ready','delivered','cancelled')),
  price decimal(10,2) default 0,
  notes text default '',
  lab_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-generate order number
create or replace function generate_order_number()
returns trigger as $$
declare
  year_part text;
  seq_num int;
begin
  year_part := to_char(now(), 'YYYY');
  select coalesce(max(cast(split_part(order_number, '-', 3) as int)), 0) + 1
  into seq_num
  from orders
  where order_number like 'CMD-' || year_part || '-%';

  new.order_number := 'CMD-' || year_part || '-' || lpad(seq_num::text, 3, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_order_number
  before insert on orders
  for each row
  when (new.order_number is null or new.order_number = '')
  execute function generate_order_number();

-- Invoices table
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  dentist_id uuid references dentists(id) on delete set null,
  date date default current_date,
  due_date date,
  amount decimal(10,2) default 0,
  tax decimal(10,2) default 0,
  total decimal(10,2) default 0,
  status text default 'unpaid' check (status in ('paid','unpaid','partial')),
  notes text default '',
  lab_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Patients table
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  gender text check (gender in ('male','female')),
  dentist_id uuid references dentists(id) on delete set null,
  lab_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Row Level Security (RLS)
alter table dentists enable row level security;
alter table orders enable row level security;
alter table invoices enable row level security;
alter table patients enable row level security;

-- Policies: users can only access their own lab's data
create policy "Users own dentists" on dentists
  for all using (lab_id = auth.uid());

create policy "Users own orders" on orders
  for all using (lab_id = auth.uid());

create policy "Users own invoices" on invoices
  for all using (lab_id = auth.uid());

create policy "Users own patients" on patients
  for all using (lab_id = auth.uid());

-- Indexes for performance
create index if not exists idx_orders_dentist_id on orders(dentist_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_due_date on orders(due_date);
create index if not exists idx_orders_lab_id on orders(lab_id);
create index if not exists idx_dentists_lab_id on dentists(lab_id);
create index if not exists idx_invoices_lab_id on invoices(lab_id);
create index if not exists idx_patients_lab_id on patients(lab_id);
