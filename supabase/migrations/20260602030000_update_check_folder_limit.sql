-- Update check_folder_limit to match the pattern used by check_snippet_limit and check_animation_limit
-- This ensures consistency, proper authorization, and counts folders directly from tables

CREATE OR REPLACE FUNCTION public.check_folder_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  user_plan plan_type;
  current_count integer := 0;
  max_allowed integer;
  can_create boolean;
  over_limit_count integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT p.plan,
         COALESCE(fc.count, 0)
    INTO user_plan, current_count
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count FROM (
        SELECT 1 FROM public.collection c WHERE c.user_id = p.id
        UNION ALL
        SELECT 1 FROM public.animation_collection ac WHERE ac.user_id = p.id
      ) folders
    ) fc ON TRUE
   WHERE p.id = p_user_id;

  IF user_plan IS NULL THEN
    RAISE EXCEPTION 'User not found for folder limit check';
  END IF;

  max_allowed := CASE user_plan 
    WHEN 'free' THEN 0 
    WHEN 'started' THEN 10 
    ELSE NULL 
  END;

  IF max_allowed IS NULL THEN
    can_create := TRUE;
  ELSE
    over_limit_count := GREATEST(current_count - max_allowed, 0);
    can_create := current_count < max_allowed;
  END IF;

  RETURN jsonb_build_object(
    'can_create', can_create,
    'canCreate', can_create,
    'current', current_count,
    'max', max_allowed,
    'plan', user_plan,
    'over_limit', over_limit_count
  );
END;
$$;

-- Update increment_folder_count to match the pattern of increment_snippet_count
-- It should check the limit first, then update counters
CREATE OR REPLACE FUNCTION public.increment_folder_count(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  limit_check jsonb;
  plan_value plan_type;
  max_allowed integer;
  actual_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  limit_check := public.check_folder_limit(p_user_id);

  IF (limit_check ->> 'can_create')::boolean IS FALSE THEN
    RETURN jsonb_set(limit_check, '{error}', to_jsonb('limit_reached'::text));
  END IF;

  plan_value := (limit_check ->> 'plan')::plan_type;
  IF (limit_check ->> 'max') IS NOT NULL THEN
    max_allowed := (limit_check ->> 'max')::integer;
  END IF;

  SELECT COUNT(*) INTO actual_count FROM (
    SELECT 1 FROM public.collection WHERE user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.animation_collection WHERE user_id = p_user_id
  ) folders;

  PERFORM ensure_usage_limits_row(p_user_id);

  INSERT INTO public.usage_limits AS ul (user_id, folder_count, last_reset_at)
  VALUES (p_user_id, actual_count, timezone('utc'::text, now()))
  ON CONFLICT (user_id) DO UPDATE
    SET folder_count = excluded.folder_count,
        last_reset_at = excluded.last_reset_at
  RETURNING folder_count INTO actual_count;

  UPDATE public.profiles
     SET folder_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'can_create', TRUE,
    'canCreate', TRUE,
    'current', actual_count,
    'max', max_allowed,
    'plan', plan_value
  );
END;
$$;

-- Update decrement_folder_count to match the pattern of decrement_snippet_count
CREATE OR REPLACE FUNCTION public.decrement_folder_count(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  actual_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*) INTO actual_count FROM (
    SELECT 1 FROM public.collection WHERE user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.animation_collection WHERE user_id = p_user_id
  ) folders;

  PERFORM ensure_usage_limits_row(p_user_id);

  INSERT INTO public.usage_limits AS ul (user_id, folder_count, last_reset_at)
  VALUES (p_user_id, actual_count, timezone('utc'::text, now()))
  ON CONFLICT (user_id) DO UPDATE
    SET folder_count = excluded.folder_count,
        last_reset_at = excluded.last_reset_at
  RETURNING folder_count INTO actual_count;

  UPDATE public.profiles
     SET folder_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'current', actual_count
  );
END;
$$;