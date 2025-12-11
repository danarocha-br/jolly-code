-- Create a helper function to update user plan with explicit type casting
-- This avoids Supabase client type validation issues with user_plan vs plan_type
CREATE OR REPLACE FUNCTION public.update_user_plan(
  p_user_id uuid,
  p_plan text,
  p_plan_updated_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    plan = p_plan::plan_type,
    plan_updated_at = p_plan_updated_at
  WHERE id = p_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO service_role;
