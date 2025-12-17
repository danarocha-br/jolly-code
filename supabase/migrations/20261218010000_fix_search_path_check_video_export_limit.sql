-- Harden search_path for check_video_export_limit to avoid role mutation issues.
-- This fixes the 404 error where PostgREST cannot find the function in the schema cache.

create or replace function public.check_video_export_limit(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_plan plan_type;
  v_current_count integer;
  v_max_limit integer;
begin
  select plan into v_plan from public.profiles where id = p_user_id;

  select video_export_count into v_current_count
  from public.usage_limits
  where user_id = p_user_id;

  v_current_count := coalesce(v_current_count, (select video_export_count from public.profiles where id = p_user_id), 0);

  v_max_limit := case v_plan
    when 'free' then 0
    when 'started' then 50
    when 'pro' then null
  end;

  return json_build_object(
    'canExport', v_max_limit is null or v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.check_video_export_limit(uuid) to authenticated;

-- Note: PostgREST schema cache refreshes automatically in Supabase hosted (1-5 minutes).
-- If you're still getting 404 errors after applying this migration:
-- 1. Wait 2-5 minutes for PostgREST cache to refresh automatically
-- 2. If using Supabase CLI locally, restart PostgREST: supabase stop && supabase start
-- 3. Verify the function exists: SELECT proname FROM pg_proc WHERE proname = 'check_video_export_limit';

