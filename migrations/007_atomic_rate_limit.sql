create or replace function consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns table(allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  current_window timestamptz;
begin
  insert into rate_limits(key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case
      when rate_limits.window_start + make_interval(secs => p_window_seconds) <= now() then now()
      else rate_limits.window_start
    end,
    count = case
      when rate_limits.window_start + make_interval(secs => p_window_seconds) <= now() then 1
      else rate_limits.count + 1
    end
  returning rate_limits.count, rate_limits.window_start into current_count, current_window;

  return query select current_count <= p_limit, greatest(p_limit - current_count, 0);
end;
$$;

revoke all on function consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function consume_rate_limit(text, integer, integer) to service_role;
