-- Weekly schedule for customers
-- Run this in your Supabase SQL Editor

create table customer_schedule (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6), -- 1=Mon … 6=Sat
  slot text not null,                                            -- e.g. '09:00'
  created_at timestamptz default now(),
  unique (customer_id, day_of_week, slot)
);

create index customer_schedule_customer_idx on customer_schedule (customer_id);

alter table customer_schedule enable row level security;

create policy "Public can read customer_schedule"
  on customer_schedule for select using (true);

create policy "Public can insert customer_schedule"
  on customer_schedule for insert with check (true);

create policy "Public can delete customer_schedule"
  on customer_schedule for delete using (true);
