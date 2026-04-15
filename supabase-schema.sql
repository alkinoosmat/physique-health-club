-- Physique Health Club - Supabase Schema
-- Run this in your Supabase SQL Editor

create table reservations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamp with time zone default now()
);

-- Index for slot capacity lookups
create index reservations_date_start_time_idx on reservations (date, start_time);

-- Index for phone lookups (cancel modal)
create index reservations_phone_idx on reservations (phone);

-- Index for date range queries
create index reservations_date_idx on reservations (date);

-- Enable Row Level Security (RLS)
alter table reservations enable row level security;

-- Allow anyone to read reservations (needed to show booked slots)
create policy "Public can read reservations"
  on reservations for select
  using (true);

-- Allow anyone to insert reservations (public booking)
create policy "Public can create reservations"
  on reservations for insert
  with check (true);

-- Allow anyone to delete reservations (cancel + admin)
create policy "Public can delete reservations"
  on reservations for delete
  using (true);

-- Allow anyone to update reservations (admin edit)
create policy "Public can update reservations"
  on reservations for update
  using (true)
  with check (true);
