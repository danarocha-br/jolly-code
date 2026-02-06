-- Track public share usage by unique views per session per day with monthly reset
-- and enforce plan-based view caps when resolving short URLs.

-- 1) Table to dedupe views by link + session + day
CREATE TABLE IF NOT EXISTS public.share_view_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.links(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_token TEXT NOT NULL,
  viewed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS share_view_events_dedupe_idx
  ON public.share_view_events (link_id, viewer_token, viewed_on);

CREATE INDEX IF NOT EXISTS share_view_events_owner_idx
  ON public.share_view_events (owner_id, viewed_on);

-- 2) Align usage_limits reset to month start
ALTER TABLE public.usage_limits
  ALTER COLUMN last_reset_at SET DEFAULT date_trunc('month', now());

-- 3) Ensure usage row exists
CREATE OR REPLACE FUNCTION ensure_usage_limits_row(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Reset helper for monthly public share views
CREATE OR REPLACE FUNCTION reset_public_share_usage(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_current_reset TIMESTAMP WITH TIME ZONE;
BEGIN
  v_period_start := date_trunc('month', now());

  SELECT last_reset_at INTO v_current_reset
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  IF v_current_reset IS NULL OR v_current_reset < v_period_start THEN
    UPDATE public.usage_limits
    SET public_share_count = 0,
        last_reset_at = v_period_start
    WHERE user_id = p_user_id;

    UPDATE public.profiles
    SET public_share_count = 0
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Check limit now reflects monthly views
CREATE OR REPLACE FUNCTION check_public_share_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  PERFORM reset_public_share_usage(p_user_id);

  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 50
    WHEN 'starter' THEN 1000
    WHEN 'pro' THEN NULL
  END;

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

-- 6) Record a view with per-session-per-day dedupe and cap enforcement
CREATE OR REPLACE FUNCTION record_public_share_view(
  p_owner_id UUID,
  p_link_id UUID,
  p_viewer_token TEXT
)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_max_limit INTEGER;
  v_current_count INTEGER;
  v_inserted BOOLEAN;
BEGIN
  PERFORM ensure_usage_limits_row(p_owner_id);
  PERFORM reset_public_share_usage(p_owner_id);

  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_owner_id;

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 50
    WHEN 'starter' THEN 1000
    WHEN 'pro' THEN NULL
  END;

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

GRANT EXECUTE ON FUNCTION record_public_share_view(UUID, UUID, TEXT) TO anon, authenticated;
