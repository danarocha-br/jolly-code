-- Ensure usage_limits row exists when checking limits to handle race conditions
-- This prevents errors when a user is created but usage_limits row doesn't exist yet

CREATE OR REPLACE FUNCTION public.check_snippet_limit(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  user_plan plan_type;
  current_count integer := 0;
  max_allowed integer;
  can_save boolean;
  over_limit_count integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure usage_limits row exists (idempotent)
  PERFORM ensure_usage_limits_row(target_user_id);

  SELECT p.plan,
         COALESCE(sc.count, 0)
    INTO user_plan, current_count
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count FROM public.snippet s WHERE s.user_id = p.id
    ) sc ON TRUE
   WHERE p.id = target_user_id;

  IF user_plan IS NULL THEN
    RAISE EXCEPTION 'User not found for limit check';
  END IF;

  max_allowed := CASE user_plan WHEN 'free' THEN 0 WHEN 'starter' THEN 50 ELSE NULL END;

  IF max_allowed IS NULL THEN
    can_save := TRUE;
  ELSE
    over_limit_count := GREATEST(current_count - max_allowed, 0);
    can_save := current_count < max_allowed;
  END IF;

  RETURN jsonb_build_object(
    'can_save', can_save,
    'current', current_count,
    'max', max_allowed,
    'plan', user_plan,
    'over_limit', over_limit_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_animation_limit(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  user_plan plan_type;
  current_count integer := 0;
  max_allowed integer;
  can_save boolean;
  over_limit_count integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure usage_limits row exists (idempotent)
  PERFORM ensure_usage_limits_row(target_user_id);

  SELECT p.plan,
         COALESCE(ac.count, 0)
    INTO user_plan, current_count
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count FROM public.animation a WHERE a.user_id = p.id
    ) ac ON TRUE
   WHERE p.id = target_user_id;

  IF user_plan IS NULL THEN
    RAISE EXCEPTION 'User not found for limit check';
  END IF;

  max_allowed := CASE user_plan WHEN 'free' THEN 0 WHEN 'starter' THEN 50 ELSE NULL END;

  IF max_allowed IS NULL THEN
    can_save := TRUE;
  ELSE
    over_limit_count := GREATEST(current_count - max_allowed, 0);
    can_save := current_count < max_allowed;
  END IF;

  RETURN jsonb_build_object(
    'can_save', can_save,
    'current', current_count,
    'max', max_allowed,
    'plan', user_plan,
    'over_limit', over_limit_count
  );
END;
$$;

-- Also ensure the handle_new_user trigger handles errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Insert profile (idempotent with ON CONFLICT)
  INSERT INTO public.profiles (id, email, name, username, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Ensure usage_limits row exists (idempotent)
  PERFORM ensure_usage_limits_row(new.id);

  RETURN new;
END;
$$;

