-- Create plan enum type
CREATE TYPE plan_type AS ENUM ('free', 'started', 'pro');

-- Add plan and usage tracking columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS plan plan_type DEFAULT 'free' NOT NULL,
  ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS snippet_count INTEGER DEFAULT 0 NOT NULL CHECK (snippet_count >= 0),
  ADD COLUMN IF NOT EXISTS animation_count INTEGER DEFAULT 0 NOT NULL CHECK (animation_count >= 0),
  ADD COLUMN IF NOT EXISTS folder_count INTEGER DEFAULT 0 NOT NULL CHECK (folder_count >= 0),
  ADD COLUMN IF NOT EXISTS video_export_count INTEGER DEFAULT 0 NOT NULL CHECK (video_export_count >= 0),
  ADD COLUMN IF NOT EXISTS public_share_count INTEGER DEFAULT 0 NOT NULL CHECK (public_share_count >= 0);

-- Add Stripe subscription columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT CHECK (
    stripe_subscription_status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing')
  ),
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Create indexes for Stripe columns
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS profiles_stripe_subscription_id_idx ON public.profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS profiles_plan_idx ON public.profiles(plan);

-- Create usage_limits table for tracking (optional, for potential future use)
CREATE TABLE IF NOT EXISTS public.usage_limits (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  snippet_count INTEGER DEFAULT 0 NOT NULL CHECK (snippet_count >= 0),
  animation_count INTEGER DEFAULT 0 NOT NULL CHECK (animation_count >= 0),
  folder_count INTEGER DEFAULT 0 NOT NULL CHECK (folder_count >= 0),
  video_export_count INTEGER DEFAULT 0 NOT NULL CHECK (video_export_count >= 0),
  public_share_count INTEGER DEFAULT 0 NOT NULL CHECK (public_share_count >= 0),
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on usage_limits
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_limits
CREATE POLICY "Users can view own usage limits." ON public.usage_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Function to get plan limits
CREATE OR REPLACE FUNCTION get_plan_limits(plan_type plan_type)
RETURNS JSON AS $$
BEGIN
  RETURN CASE plan_type
    WHEN 'free' THEN '{"maxSnippets": 10, "maxAnimations": 10, "maxSlidesPerAnimation": 5, "maxSnippetsFolder": 0, "maxVideoExportCount": 0, "shareAsPublicURL": 3}'::json
    WHEN 'started' THEN '{"maxSnippets": 50, "maxAnimations": 50, "maxSlidesPerAnimation": 10, "maxSnippetsFolder": 10, "maxVideoExportCount": 50, "shareAsPublicURL": 50}'::json
    WHEN 'pro' THEN '{"maxSnippets": null, "maxAnimations": null, "maxSlidesPerAnimation": null, "maxSnippetsFolder": null, "maxVideoExportCount": null, "shareAsPublicURL": null}'::json
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check snippet limit
CREATE OR REPLACE FUNCTION check_snippet_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan, snippet_count INTO v_plan, v_current_count
  FROM public.profiles
  WHERE id = p_user_id;

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 0
    WHEN 'started' THEN 50
    WHEN 'pro' THEN NULL -- NULL means unlimited
  END;

  RETURN json_build_object(
    'canSave', v_max_limit IS NULL OR v_current_count < v_max_limit,
    'current', v_current_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check animation limit
CREATE OR REPLACE FUNCTION check_animation_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan, animation_count INTO v_plan, v_current_count
  FROM public.profiles
  WHERE id = p_user_id;

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

-- Function to check folder limit
CREATE OR REPLACE FUNCTION check_folder_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan, folder_count INTO v_plan, v_current_count
  FROM public.profiles
  WHERE id = p_user_id;

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

-- Function to check video export limit
CREATE OR REPLACE FUNCTION check_video_export_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan, video_export_count INTO v_plan, v_current_count
  FROM public.profiles
  WHERE id = p_user_id;

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

-- Function to check public share limit
CREATE OR REPLACE FUNCTION check_public_share_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  SELECT plan, public_share_count INTO v_plan, v_current_count
  FROM public.profiles
  WHERE id = p_user_id;

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

-- Function to check slide count limit
CREATE OR REPLACE FUNCTION check_slide_limit(p_user_id UUID, p_slide_count INTEGER)
RETURNS JSON AS $$
DECLARE
  v_plan plan_type;
  v_max_limit INTEGER;
BEGIN
  SELECT plan INTO v_plan
  FROM public.profiles
  WHERE id = p_user_id;

  v_max_limit := CASE v_plan
    WHEN 'free' THEN 5
    WHEN 'started' THEN 10
    WHEN 'pro' THEN NULL
  END;

  RETURN json_build_object(
    'canAdd', v_max_limit IS NULL OR p_slide_count <= v_max_limit,
    'slideCount', p_slide_count,
    'max', v_max_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment snippet count
CREATE OR REPLACE FUNCTION increment_snippet_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET snippet_count = snippet_count + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment animation count
CREATE OR REPLACE FUNCTION increment_animation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET animation_count = animation_count + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment folder count
CREATE OR REPLACE FUNCTION increment_folder_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET folder_count = folder_count + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment video export count
CREATE OR REPLACE FUNCTION increment_video_export_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET video_export_count = video_export_count + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment public share count
CREATE OR REPLACE FUNCTION increment_public_share_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET public_share_count = public_share_count + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement snippet count
CREATE OR REPLACE FUNCTION decrement_snippet_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET snippet_count = GREATEST(0, snippet_count - 1)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement animation count
CREATE OR REPLACE FUNCTION decrement_animation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET animation_count = GREATEST(0, animation_count - 1)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement folder count
CREATE OR REPLACE FUNCTION decrement_folder_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET folder_count = GREATEST(0, folder_count - 1)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement video export count
CREATE OR REPLACE FUNCTION decrement_video_export_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET video_export_count = GREATEST(0, video_export_count - 1)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement public share count
CREATE OR REPLACE FUNCTION decrement_public_share_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET public_share_count = GREATEST(0, public_share_count - 1)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user usage stats
CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT 
    plan,
    snippet_count,
    animation_count,
    folder_count,
    video_export_count,
    public_share_count
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN json_build_object(
    'plan', v_profile.plan,
    'snippetCount', v_profile.snippet_count,
    'animationCount', v_profile.animation_count,
    'folderCount', v_profile.folder_count,
    'videoExportCount', v_profile.video_export_count,
    'publicShareCount', v_profile.public_share_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_snippet_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_animation_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_folder_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_video_export_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_public_share_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_slide_limit(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_snippet_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_animation_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_folder_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_video_export_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_public_share_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_snippet_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_animation_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_folder_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_video_export_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_public_share_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_limits(plan_type) TO authenticated;
