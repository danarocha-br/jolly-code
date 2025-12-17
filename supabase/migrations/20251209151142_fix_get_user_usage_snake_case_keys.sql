-- Fix get_user_usage fallback function to return snake_case keys
-- This ensures consistency with get_user_usage_v2 and matches what the TypeScript consumer expects

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
    'snippet_count', v_profile.snippet_count,
    'animation_count', v_profile.animation_count,
    'folder_count', v_profile.folder_count,
    'video_export_count', v_profile.video_export_count,
    'public_share_count', v_profile.public_share_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

