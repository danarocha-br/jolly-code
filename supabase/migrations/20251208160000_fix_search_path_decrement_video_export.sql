-- Harden search_path for decrement_video_export_count to avoid role mutation issues.

create or replace function public.decrement_video_export_count(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform ensure_usage_limits_row(p_user_id);

  update public.usage_limits
     set video_export_count = greatest(0, video_export_count - 1)
   where user_id = p_user_id;

  update public.profiles
     set video_export_count = greatest(0, video_export_count - 1)
   where id = p_user_id;
end;
$$;
