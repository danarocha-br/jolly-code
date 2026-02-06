-- Recreate reconcile_over_limit_content to use plan_type (user_plan enum was dropped)
-- Align limits with get_plan_limits to avoid drift with app config

DROP FUNCTION IF EXISTS public.reconcile_over_limit_content(uuid);

CREATE OR REPLACE FUNCTION public.reconcile_over_limit_content(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_plan plan_type;
  v_limits json;
  v_snippet_max integer;
  v_animation_max integer;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'User not found for over-limit reconciliation';
  END IF;

  -- pull limits from canonical helper to avoid hard-coded values
  v_limits := get_plan_limits(v_plan);
  v_snippet_max := (v_limits ->> 'maxSnippets')::integer;
  v_animation_max := (v_limits ->> 'maxAnimations')::integer;

  -- Mark snippets over limit: newest kept, older marked over_limit
  IF v_snippet_max IS NULL THEN
    UPDATE public.snippet SET over_limit = false WHERE user_id = p_user_id;
  ELSE
    WITH ranked AS (
      SELECT id, row_number() OVER (ORDER BY created_at DESC NULLS LAST) AS rn
      FROM public.snippet
      WHERE user_id = p_user_id
    )
    UPDATE public.snippet s
       SET over_limit = (r.rn > v_snippet_max)
      FROM ranked r
     WHERE s.id = r.id;
  END IF;

  -- Mark animations over limit similarly
  IF v_animation_max IS NULL THEN
    UPDATE public.animation SET over_limit = false WHERE user_id = p_user_id;
  ELSE
    WITH ranked AS (
      SELECT id, row_number() OVER (ORDER BY created_at DESC NULLS LAST) AS rn
      FROM public.animation
      WHERE user_id = p_user_id
    )
    UPDATE public.animation a
       SET over_limit = (r.rn > v_animation_max)
      FROM ranked r
     WHERE a.id = r.id;
  END IF;
END;
$$;
