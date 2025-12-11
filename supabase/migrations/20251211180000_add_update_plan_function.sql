
-- Fix any potential default value issues first
-- Ensure the default uses plan_type explicitly
ALTER TABLE public.profiles 
  ALTER COLUMN plan DROP DEFAULT IF EXISTS;

ALTER TABLE public.profiles 
  ALTER COLUMN plan SET DEFAULT 'free'::plan_type;

-- Create a helper function to update user plan with explicit type casting
-- This avoids Supabase client type validation issues with user_plan vs plan_type
-- The function uses dynamic SQL to bypass any type checking issues
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
DECLARE
  v_sql text;
BEGIN
  -- Use dynamic SQL to ensure explicit casting happens at execution time
  -- This bypasses any schema-level type validation
  v_sql := format(
    'UPDATE public.profiles SET plan = %L::plan_type, plan_updated_at = %L WHERE id = %L',
    p_plan,
    p_plan_updated_at,
    p_user_id
  );
  
  EXECUTE v_sql;
  
  -- Verify the update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO anon;
