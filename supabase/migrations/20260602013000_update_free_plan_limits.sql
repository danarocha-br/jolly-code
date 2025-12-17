-- Bump free plan limits for snippets/animations to 10 and align function return types.

DROP FUNCTION IF EXISTS public.check_snippet_limit(uuid);
DROP FUNCTION IF EXISTS public.check_animation_limit(uuid);

CREATE OR REPLACE FUNCTION public.check_snippet_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  SELECT snippet_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  v_current_count := COALESCE(v_current_count, (SELECT snippet_count FROM public.profiles WHERE id = p_user_id), 0);

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 10
    WHEN 'starter' THEN 50
    WHEN 'pro' THEN NULL
  END;

  RETURN jsonb_build_object(
    'canSave', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.check_animation_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  SELECT animation_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  v_current_count := COALESCE(v_current_count, (SELECT animation_count FROM public.profiles WHERE id = p_user_id), 0);

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 10
    WHEN 'starter' THEN 50
    WHEN 'pro' THEN NULL
  END;

  RETURN jsonb_build_object(
    'canSave', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

GRANT EXECUTE ON FUNCTION public.check_snippet_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_animation_limit(uuid) TO authenticated;
