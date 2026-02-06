-- Align plan limits with application configuration and centralize lookups.

CREATE OR REPLACE FUNCTION get_plan_limits(plan_type plan_type)
RETURNS JSON AS $$
BEGIN
  RETURN CASE plan_type
    WHEN 'free' THEN '{"maxSnippets": 0, "maxAnimations": 0, "maxSlidesPerAnimation": 3, "maxSnippetsFolder": 0, "maxVideoExportCount": 0, "shareAsPublicURL": 50}'::json
    WHEN 'starter' THEN '{"maxSnippets": 50, "maxAnimations": 50, "maxSlidesPerAnimation": 10, "maxSnippetsFolder": 10, "maxVideoExportCount": 50, "shareAsPublicURL": 1000}'::json
    WHEN 'pro' THEN '{"maxSnippets": null, "maxAnimations": null, "maxSlidesPerAnimation": null, "maxSnippetsFolder": null, "maxVideoExportCount": null, "shareAsPublicURL": null}'::json
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Public share limits now reuse get_plan_limits to avoid drift across environments.
CREATE OR REPLACE FUNCTION check_public_share_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_plan_limits JSON;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  PERFORM reset_public_share_usage(p_user_id);

  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  v_plan_limits := get_plan_limits(v_plan);
  v_max_limit := (v_plan_limits->>'shareAsPublicURL')::INTEGER;

  SELECT public_share_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'canShare', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record public share views using centralized plan limits.
CREATE OR REPLACE FUNCTION record_public_share_view(
  p_owner_id UUID,
  p_link_id UUID,
  p_viewer_token TEXT
)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_plan_limits JSON;
  v_max_limit INTEGER;
  v_current_count INTEGER;
  v_inserted BOOLEAN;
BEGIN
  PERFORM ensure_usage_limits_row(p_owner_id);
  PERFORM reset_public_share_usage(p_owner_id);

  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_owner_id;
  v_plan_limits := get_plan_limits(v_plan);
  v_max_limit := (v_plan_limits->>'shareAsPublicURL')::INTEGER;

  SELECT public_share_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_owner_id;

  IF v_max_limit IS NOT NULL AND v_current_count >= v_max_limit THEN
    RETURN json_build_object(
      'allowed', FALSE,
      'counted', FALSE,
      'current', v_current_count,
      'max', v_max_limit,
      'plan', v_plan
    );
  END IF;

  INSERT INTO public.share_view_events (link_id, owner_id, viewer_token, viewed_on)
  VALUES (p_link_id, p_owner_id, p_viewer_token, CURRENT_DATE)
  ON CONFLICT (link_id, viewer_token, viewed_on) DO NOTHING;
  v_inserted := FOUND;

  IF v_inserted THEN
    UPDATE public.usage_limits SET public_share_count = public_share_count + 1 WHERE user_id = p_owner_id;
    UPDATE public.profiles SET public_share_count = public_share_count + 1 WHERE id = p_owner_id;
  END IF;

  SELECT public_share_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_owner_id;

  RETURN json_build_object(
    'allowed', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'counted', v_inserted,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
