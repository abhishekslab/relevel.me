-- Function to calculate the current call streak for a user
-- Returns the number of consecutive days (from today backwards) where user had a completed call
create or replace function get_user_call_streak(p_user_id uuid)
returns integer
language plpgsql
stable
as $$
declare
  v_streak integer := 0;
  v_check_date date;
  v_has_call boolean;
begin
  -- Start from today
  v_check_date := current_date;

  -- Loop backwards through days
  loop
    -- Check if user had a completed call on this date
    select exists(
      select 1
      from calls
      where user_id = p_user_id
        and status = 'completed'
        and date(created_at at time zone 'UTC') = v_check_date
    ) into v_has_call;

    -- If no call on this day, break the streak
    exit when not v_has_call;

    -- Increment streak and check previous day
    v_streak := v_streak + 1;
    v_check_date := v_check_date - interval '1 day';

    -- Safety limit to prevent infinite loops
    exit when v_streak > 1000;
  end loop;

  return v_streak;
end;
$$;
