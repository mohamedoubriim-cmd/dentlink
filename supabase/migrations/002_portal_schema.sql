-- DentLink - Portal Schema (run AFTER 001_initial_schema.sql)

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text default 'dentist' check (role in ('lab_admin', 'dentist')),
  full_name text default '',
  phone text default '',
  clinic text default '',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Read all profiles" on profiles for select to authenticated using (true);
create policy "Manage own profile" on profiles for all to authenticated using (id = auth.uid());

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'dentist'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Update orders: add dentist_user_id ───────────────────────────────────────
alter table orders add column if not exists dentist_user_id uuid references auth.users(id);

-- Drop old restrictive policies
drop policy if exists "Users own orders" on orders;
drop policy if exists "Users own dentists" on dentists;
drop policy if exists "Users own invoices" on invoices;
drop policy if exists "Users own patients" on patients;

-- Orders: lab admins see all, dentists see only their own
create policy "Lab admins manage all orders" on orders for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'lab_admin'));

create policy "Dentists read own orders" on orders for select to authenticated
  using (dentist_user_id = auth.uid());

create policy "Dentists insert own orders" on orders for insert to authenticated
  with check (dentist_user_id = auth.uid());

-- Lab resources: only lab admins
create policy "Lab admins manage dentists" on dentists for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'lab_admin'));

create policy "Lab admins manage invoices" on invoices for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'lab_admin'));

create policy "Lab admins manage patients" on patients for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'lab_admin'));

-- ── Order files ───────────────────────────────────────────────────────────────
create table if not exists order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  name text not null,
  size bigint default 0,
  mime_type text default '',
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table order_files enable row level security;
create policy "Authenticated access files" on order_files for all to authenticated using (true);

-- ── Storage bucket ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-files', 'order-files', false, 52428800)
on conflict (id) do nothing;

create policy "Upload order files" on storage.objects
  for insert to authenticated with check (bucket_id = 'order-files');

create policy "Read order files" on storage.objects
  for select to authenticated using (bucket_id = 'order-files');

create policy "Delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'order-files' and auth.uid()::text = (storage.foldername(name))[1]);
