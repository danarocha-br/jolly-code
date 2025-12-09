-- Make usage_limits the source of truth for counters (snippets, animations, folders, video exports, public shares)
-- while keeping profiles plan metadata. The existing RPCs are updated to read/write usage_limits and also
-- update profiles counts for backward compatibility with any legacy reads.

-- 1) Backfill usage_limits from profiles for any missing rows
INSERT INTO public.usage_limits (user_id, snippet_count, animation_count, folder_count, video_export_count, public_share_count)
SELECT
  id AS user_id,
  COALESCE(snippet_count, 0),
  COALESCE(animation_count, 0),
  COALESCE(folder_count, 0),
  COALESCE(video_export_count, 0),
  COALESCE(public_share_count, 0)
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 2) Relax RLS to allow owners to insert/update their own usage rows
DROP POLICY IF EXISTS "Users can view own usage limits." ON public.usage_limits;
CREATE POLICY "Users can view own usage limits." ON public.usage_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage limits." ON public.usage_limits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage limits." ON public.usage_limits
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) Helper to ensure a usage_limits row exists for the user
CREATE OR REPLACE FUNCTION ensure_usage_limits_row(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.usage_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Rework limit checks to read usage_limits first (fallback to profiles counts)

CREATE OR REPLACE FUNCTION check_snippet_limit(p_user_id UUID)
RETURNS JSON AS $$
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
    WHEN 'free' THEN 0
    WHEN 'started' THEN 50
    WHEN 'pro' THEN NULL
  END;

  RETURN json_build_object(
    'canSave', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_animation_limit(p_user_id UUID)
RETURNS JSON AS $$
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
    WHEN 'free' THEN 0
    WHEN 'started' THEN 50
    WHEN 'pro' THEN NULL
  END;

  RETURN json_build_object(
    'canSave', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_folder_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  SELECT folder_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  v_current_count := COALESCE(v_current_count, (SELECT folder_count FROM public.profiles WHERE id = p_user_id), 0);

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 0
    WHEN 'started' THEN 10
    WHEN 'pro' THEN NULL
  END;

  RETURN json_build_object(
    'canCreate', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_video_export_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  SELECT video_export_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  v_current_count := COALESCE(v_current_count, (SELECT video_export_count FROM public.profiles WHERE id = p_user_id), 0);

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 0
    WHEN 'started' THEN 50
    WHEN 'pro' THEN NULL
  END;

  RETURN json_build_object(
    'canExport', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_public_share_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  SELECT public_share_count INTO v_current_count
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  v_current_count := COALESCE(v_current_count, (SELECT public_share_count FROM public.profiles WHERE id = p_user_id), 0);

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 3
    WHEN 'started' THEN 50
    WHEN 'pro' THEN NULL
  END;

  RETURN json_build_object(
    'canShare', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Increment/decrement helpers use usage_limits as the source of truth and mirror into profiles for legacy reads

-- Note: PL/pgSQL functions execute within a single transaction and the two UPDATEs are atomic
-- (no explicit transaction wrapper is needed), so there is no race condition.
CREATE OR REPLACE FUNCTION increment_snippet_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET snippet_count = snippet_count + 1 WHERE user_id = p_user_id;
  UPDATE public.profiles SET snippet_count = snippet_count + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: PL/pgSQL functions execute within a single transaction and the two UPDATEs are atomic
-- (no explicit transaction wrapper is needed), so there is no race condition.
CREATE OR REPLACE FUNCTION increment_animation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET animation_count = animation_count + 1 WHERE user_id = p_user_id;
  UPDATE public.profiles SET animation_count = animation_count + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_folder_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET folder_count = folder_count + 1 WHERE user_id = p_user_id;
  UPDATE public.profiles SET folder_count = folder_count + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_video_export_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET video_export_count = video_export_count + 1 WHERE user_id = p_user_id;
  UPDATE public.profiles SET video_export_count = video_export_count + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_public_share_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET public_share_count = public_share_count + 1 WHERE user_id = p_user_id;
  UPDATE public.profiles SET public_share_count = public_share_count + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_snippet_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET snippet_count = GREATEST(0, snippet_count - 1) WHERE user_id = p_user_id;
  UPDATE public.profiles SET snippet_count = GREATEST(0, snippet_count - 1) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_animation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET animation_count = GREATEST(0, animation_count - 1) WHERE user_id = p_user_id;
  UPDATE public.profiles SET animation_count = GREATEST(0, animation_count - 1) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_folder_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET folder_count = GREATEST(0, folder_count - 1) WHERE user_id = p_user_id;
  UPDATE public.profiles SET folder_count = GREATEST(0, folder_count - 1) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_public_share_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits SET public_share_count = GREATEST(0, public_share_count - 1) WHERE user_id = p_user_id;
  UPDATE public.profiles SET public_share_count = GREATEST(0, public_share_count - 1) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) get_user_usage now reads from usage_limits for counters and profiles for plan
CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_usage RECORD;
BEGIN
  SELECT plan INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT snippet_count, animation_count, folder_count, video_export_count, public_share_count
  INTO v_usage
  FROM public.usage_limits
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'plan', v_profile.plan,
    'snippetCount', COALESCE(v_usage.snippet_count, 0),
    'animationCount', COALESCE(v_usage.animation_count, 0),
    'folderCount', COALESCE(v_usage.folder_count, 0),
    'videoExportCount', COALESCE(v_usage.video_export_count, 0),
    'publicShareCount', COALESCE(v_usage.public_share_count, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
