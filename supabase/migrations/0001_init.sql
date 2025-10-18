-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- USERS TABLE
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  local_tz text not null default 'Asia/Kolkata',
  evening_window tstzrange not null default tstzrange(
    date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'UTC' + interval '12:30 hours',
    date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'UTC' + interval '13:30 hours',
    '[)'
  ),
  created_at timestamptz default now()
);

-- CALLS TABLE
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  to_number text not null,
  agent_id text not null,
  scheduled_at timestamptz not null,
  status text not null default 'queued', -- queued, ringing, in_progress, completed, failed
  vendor_call_id text unique,
  vendor_payload jsonb,
  last_status_at timestamptz default now(),
  transcript_text text,
  audio_path text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists calls_user_status_idx on calls (user_id, status);
create index if not exists calls_tsv_idx on calls using gin(to_tsvector('english', coalesce(transcript_text, '')));
create index if not exists calls_created_at_idx on calls (created_at desc);

-- Enable Row Level Security
alter table users enable row level security;
alter table calls enable row level security;

-- RLS Policies
drop policy if exists "user_can_read_own_calls" on calls;
create policy "user_can_read_own_calls"
  on calls for select using (auth.uid() = user_id);

drop policy if exists "user_can_read_own_profile" on users;
create policy "user_can_read_own_profile"
  on users for select using (auth.uid() = id);

-- Helper function: Get users needing a call today
create or replace function get_users_needing_call_today()
returns table (id uuid, phone text, name text)
language sql stable as $$
  with today as (
    select date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'UTC' as d_utc
  )
  select u.id, u.phone, u.name
  from users u, today t
  where not exists (
    select 1 from calls c
    where c.user_id = u.id
      and c.created_at >= t.d_utc
      and c.status in ('queued','ringing','in_progress','completed')
  );
$$;

-- Seed data: Test user (replace with your phone number)
insert into users (phone, name) values ('+919876543210', 'Test User') on conflict do nothing;

-- Create storage bucket for audio recordings
insert into storage.buckets (id, name, public) values ('audio', 'audio', false) on conflict do nothing;

-- Storage policies for audio bucket
drop policy if exists "Users can read own audio" on storage.objects;
create policy "Users can read own audio"
  on storage.objects for select using (
    bucket_id = 'audio' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
