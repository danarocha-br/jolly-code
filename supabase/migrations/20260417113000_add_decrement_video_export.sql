-- Add decrement function for video export counts to keep usage accurate on failure or rollback.

CREATE OR REPLACE FUNCTION decrement_video_export_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM ensure_usage_limits_row(p_user_id);
  UPDATE public.usage_limits
  SET video_export_count = GREATEST(0, video_export_count - 1)
  WHERE user_id = p_user_id;

  UPDATE public.profiles
  SET video_export_count = GREATEST(0, video_export_count - 1)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
