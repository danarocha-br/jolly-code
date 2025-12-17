-- Harden search_path for increment_video_export_count to avoid role mutation issues.
-- This fixes the 404 error where PostgREST cannot find the function in the schema cache.

create or replace function public.increment_video_export_count(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform ensure_usage_limits_row(p_user_id);

  update public.usage_limits
     set video_export_count = video_export_count + 1
   where user_id = p_user_id;

  update public.profiles
     set video_export_count = video_export_count + 1
   where id = p_user_id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.increment_video_export_count(uuid) to authenticated;

-- Note: PostgREST schema cache refreshes automatically in Supabase hosted (1-5 minutes).
-- If you're still getting 404 errors after applying this migration:
-- 1. Wait 2-5 minutes for PostgREST cache to refresh automatically
-- 2. If using Supabase CLI locally, restart PostgREST: supabase stop && supabase start
-- 3. Verify the function exists: SELECT proname FROM pg_proc WHERE proname = 'increment_video_export_count';

