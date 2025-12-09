-- Align get_user_usage with snake_case keys to match clients/get_user_usage_v2.

DROP FUNCTION IF EXISTS public.get_user_usage(uuid);

CREATE OR REPLACE FUNCTION public.get_user_usage(p_user_id UUID)
RETURNS JSONB AS $$
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

  RETURN jsonb_build_object(
    'plan', v_profile.plan,
    'snippet_count', v_profile.snippet_count,
    'animation_count', v_profile.animation_count,
    'folder_count', v_profile.folder_count,
    'video_export_count', v_profile.video_export_count,
    'public_share_count', v_profile.public_share_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_user_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_usage(uuid) TO anon;
