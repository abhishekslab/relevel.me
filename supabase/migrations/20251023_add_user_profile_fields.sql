-- Add profile fields to users table
alter table users add column if not exists first_name text;
alter table users add column if not exists avatar_url text;
alter table users add column if not exists avatar_gender text default 'feminine' check (avatar_gender in ('feminine', 'masculine'));

-- Update RLS policy to allow users to update their own profile
drop policy if exists "user_can_update_own_profile" on users;
create policy "user_can_update_own_profile"
  on users for update using (auth.uid() = id);
