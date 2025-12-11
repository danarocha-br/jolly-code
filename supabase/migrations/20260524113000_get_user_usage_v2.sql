-- Provide a new RPC name to avoid stale PostgREST cache issues with the previous function name.

create or replace function public.get_user_usage_v2(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_usage record;
  v_plan_limits json;
  v_over_limit_snippets integer := 0;
  v_over_limit_animations integer := 0;
  v_role text := current_setting('request.jwt.claim.role', true);
begin
  -- Permit service_role to query any user; otherwise require the caller to be the user.
  if coalesce(v_role, '') <> 'service_role' then
    if auth.uid() is null or auth.uid() is distinct from p_user_id then
      raise exception 'Unauthorized';
    end if;
  end if;

  perform ensure_usage_limits_row(p_user_id);

  with profile as (
    select id, plan
    from public.profiles
    where id = p_user_id
  ),
  counts as (
    select
      p.plan,
      greatest(
        coalesce(ul.snippet_count, 0),
        (select count(*) from public.snippet s where s.user_id = p_user_id)
      ) as snippet_count,
      greatest(
        coalesce(ul.animation_count, 0),
        (select count(*) from public.animation a where a.user_id = p_user_id)
      ) as animation_count,
      greatest(
        coalesce(ul.folder_count, 0),
        (
          select count(*) from (
            select 1 from public.collection c where c.user_id = p_user_id
            union all
            select 1 from public.animation_collection ac where ac.user_id = p_user_id
          ) folders
        )
      ) as folder_count,
      coalesce(ul.video_export_count, 0) as video_export_count,
      coalesce(ul.public_share_count, 0) as public_share_count,
      ul.last_reset_at
    from profile p
    left join public.usage_limits ul on ul.user_id = p.id
  )
  select * into v_usage from counts;

  if v_usage.plan is null then
    raise exception 'User not found';
  end if;

  -- Convert user_plan enum to plan_type enum via text (profiles.plan is user_plan, get_plan_limits expects plan_type)
  -- user_plan has ('free', 'pro'), plan_type has ('free', 'started', 'pro')
  v_plan_limits := get_plan_limits(v_usage.plan::text::plan_type);

  if (v_plan_limits ->> 'maxSnippets') is not null then
    v_over_limit_snippets := greatest(
      v_usage.snippet_count - (v_plan_limits ->> 'maxSnippets')::integer,
      0
    );
  end if;

  if (v_plan_limits ->> 'maxAnimations') is not null then
    v_over_limit_animations := greatest(
      v_usage.animation_count - (v_plan_limits ->> 'maxAnimations')::integer,
      0
    );
  end if;

  return jsonb_build_object(
    'plan', v_usage.plan,
    'snippet_count', v_usage.snippet_count,
    'animation_count', v_usage.animation_count,
    'folder_count', v_usage.folder_count,
    'video_export_count', v_usage.video_export_count,
    'public_share_count', v_usage.public_share_count,
    'last_reset_at', v_usage.last_reset_at,
    'over_limit_snippets', v_over_limit_snippets,
    'over_limit_animations', v_over_limit_animations
  );
end;
$$;

grant execute on function public.get_user_usage_v2(uuid) to authenticated;
grant execute on function public.get_user_usage_v2(uuid) to anon;

-- PostgREST Schema Cache Refresh
-- In Supabase hosted, PostgREST schema cache refreshes automatically, but it may take 1-5 minutes.
-- If you're still getting 404 errors after applying this migration:
--
-- 1. Verify the function exists:
--    SELECT proname, pg_get_function_arguments(oid) 
--    FROM pg_proc 
--    WHERE proname = 'get_user_usage_v2';
--
-- 2. Verify grants are correct:
--    SELECT grantee, privilege_type 
--    FROM information_schema.routine_privileges 
--    WHERE routine_name = 'get_user_usage_v2';
--
-- 3. Wait 2-5 minutes for PostgREST cache to refresh automatically
--
-- 4. If using Supabase CLI locally, restart PostgREST:
--    supabase stop && supabase start
--
-- 5. Check Supabase Dashboard > Database > Functions to confirm visibility
--
-- 6. As a workaround, the application will fall back to getUserUsageFallback() 
--    if the RPC returns 404, so functionality should continue to work.
