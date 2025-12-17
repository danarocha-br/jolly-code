-- Recreate update_user_plan to rely on explicit rowcount instead of FOUND after EXECUTE
-- Keeps dynamic SQL casting to plan_type and preserves default

DROP FUNCTION IF EXISTS public.update_user_plan(uuid, text, timestamptz);

ALTER TABLE public.profiles 
  ALTER COLUMN plan DROP DEFAULT;

ALTER TABLE public.profiles 
  ALTER COLUMN plan SET DEFAULT 'free'::plan_type;

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
  v_rows integer := 0;
BEGIN
  v_sql := format(
    'UPDATE public.profiles SET plan = %L::plan_type, plan_updated_at = %L WHERE id = %L',
    p_plan,
    p_plan_updated_at,
    p_user_id
  );
  
  EXECUTE v_sql;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  
  IF COALESCE(v_rows, 0) = 0 THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_plan(uuid, text, timestamptz) TO anon;
