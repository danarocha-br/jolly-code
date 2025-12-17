-- Fix refresh_usage_counters function to handle user deletion gracefully
-- When a user is being deleted, the profile row may already be deleted or in the process
-- of being deleted. We need to check if the profile exists before trying to update it.
-- This is a re-application of the fix that was removed in migration 20261216184405

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
  v_profile_exists boolean;
BEGIN
  -- Check if profile exists before proceeding
  -- If profile doesn't exist, the user is being deleted, so skip counter updates
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    -- Profile doesn't exist, user is being deleted - skip counter updates
    RETURN;
  END IF;

  PERFORM ensure_usage_limits_row(p_user_id);

  SELECT COUNT(*) INTO v_snippet_count FROM public.snippet WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_animation_count FROM public.animation WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_folder_count FROM (
    SELECT 1 FROM public.collection WHERE user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.animation_collection WHERE user_id = p_user_id
  ) AS folders;

  -- Only update if profile still exists (double-check to avoid race conditions)
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
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
  END IF;
END;
$$;

