-- Fix refresh_usage_counters function to remove non-existent updated_at column reference
-- The usage_limits table does not have an updated_at column, only last_reset_at

CREATE OR REPLACE FUNCTION public.refresh_usage_counters(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_snippet_count integer;
  v_animation_count integer;
  v_folder_count integer;
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);

  SELECT COUNT(*) INTO v_snippet_count FROM public.snippet WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_animation_count FROM public.animation WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_folder_count FROM (
    SELECT 1 FROM public.collection WHERE user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.animation_collection WHERE user_id = p_user_id
  ) AS folders;

  UPDATE public.usage_limits
     SET snippet_count = v_snippet_count,
         animation_count = v_animation_count,
         folder_count = v_folder_count
   WHERE user_id = p_user_id;

  UPDATE public.profiles
     SET snippet_count = v_snippet_count,
         animation_count = v_animation_count,
         folder_count = v_folder_count
   WHERE id = p_user_id;
END;
$$;

