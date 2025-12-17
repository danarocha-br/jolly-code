-- Consolidate profiles.plan to plan_type (from legacy user_plan) and refresh related functions/triggers.

-- Ensure enums include all needed values before casting.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'starter'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'plan_type')
  ) THEN
    ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'starter';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'starter'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_plan')
    ) THEN
      ALTER TYPE user_plan ADD VALUE IF NOT EXISTS 'starter';
    END IF;
  END IF;
END $$;

-- Drop trigger depending on profiles.plan so the type change can proceed.
DROP TRIGGER IF EXISTS trg_profiles_plan_change ON public.profiles;

-- Drop dependent functions so we can recreate them with plan_type.
DROP FUNCTION IF EXISTS public.check_snippet_limit(uuid);
DROP FUNCTION IF EXISTS public.check_animation_limit(uuid);
DROP FUNCTION IF EXISTS public.increment_snippet_count(uuid);
DROP FUNCTION IF EXISTS public.increment_animation_count(uuid);
DROP FUNCTION IF EXISTS public.get_user_usage_v2(uuid);

-- Drop default, cast column to plan_type, then set new default.
ALTER TABLE public.profiles ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE public.profiles
  ALTER COLUMN plan TYPE plan_type USING plan::text::plan_type;
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'free'::plan_type;

-- Recreate the plan change trigger with same logic.
CREATE OR REPLACE FUNCTION public.handle_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF (tg_op = 'UPDATE') AND (NEW.plan IS DISTINCT FROM OLD.plan) THEN
    PERFORM public.reconcile_over_limit_content(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_plan_change
AFTER UPDATE OF plan ON public.profiles
FOR EACH ROW EXECUTE FUNCTION handle_plan_change();

-- Refresh plan-aware functions to use plan_type.
CREATE OR REPLACE FUNCTION public.check_snippet_limit(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  user_plan plan_type;
  current_count integer := 0;
  max_allowed integer;
  can_save boolean;
  over_limit_count integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT p.plan,
         COALESCE(sc.count, 0)
    INTO user_plan, current_count
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count FROM public.snippet s WHERE s.user_id = p.id
    ) sc ON TRUE
   WHERE p.id = target_user_id;

  IF user_plan IS NULL THEN
    RAISE EXCEPTION 'User not found for limit check';
  END IF;

  max_allowed := CASE user_plan WHEN 'free' THEN 0 WHEN 'starter' THEN 50 ELSE NULL END;

  IF max_allowed IS NULL THEN
    can_save := TRUE;
  ELSE
    over_limit_count := GREATEST(current_count - max_allowed, 0);
    can_save := current_count < max_allowed;
  END IF;

  RETURN jsonb_build_object(
    'can_save', can_save,
    'current', current_count,
    'max', max_allowed,
    'plan', user_plan,
    'over_limit', over_limit_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_animation_limit(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  user_plan plan_type;
  current_count integer := 0;
  max_allowed integer;
  can_save boolean;
  over_limit_count integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT p.plan,
         COALESCE(ac.count, 0)
    INTO user_plan, current_count
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count FROM public.animation a WHERE a.user_id = p.id
    ) ac ON TRUE
   WHERE p.id = target_user_id;

  IF user_plan IS NULL THEN
    RAISE EXCEPTION 'User not found for animation limit check';
  END IF;

  max_allowed := CASE user_plan WHEN 'free' THEN 0 WHEN 'starter' THEN 50 ELSE NULL END;

  IF max_allowed IS NULL THEN
    can_save := TRUE;
  ELSE
    over_limit_count := GREATEST(current_count - max_allowed, 0);
    can_save := current_count < max_allowed;
  END IF;

  RETURN jsonb_build_object(
    'can_save', can_save,
    'current', current_count,
    'max', max_allowed,
    'plan', user_plan,
    'over_limit', over_limit_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_snippet_count(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  limit_check jsonb;
  plan_value plan_type;
  max_allowed integer;
  actual_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  limit_check := public.check_snippet_limit(target_user_id);

  IF (limit_check ->> 'can_save')::boolean IS FALSE THEN
    RETURN jsonb_set(limit_check, '{error}', to_jsonb('limit_reached'::text));
  END IF;

  plan_value := (limit_check ->> 'plan')::plan_type;
  IF (limit_check ->> 'max') IS NOT NULL THEN
    max_allowed := (limit_check ->> 'max')::integer;
  END IF;

  SELECT COUNT(*) INTO actual_count FROM public.snippet WHERE user_id = target_user_id;

  INSERT INTO public.usage_limits AS ul (user_id, snippet_count, last_reset_at)
  VALUES (target_user_id, actual_count, timezone('utc'::text, now()))
  ON CONFLICT (user_id) DO UPDATE
    SET snippet_count = excluded.snippet_count,
        last_reset_at = excluded.last_reset_at
  RETURNING snippet_count INTO actual_count;

  UPDATE public.profiles
     SET snippet_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'can_save', TRUE,
    'current', actual_count,
    'max', max_allowed,
    'plan', plan_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_animation_count(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  limit_check jsonb;
  plan_value plan_type;
  max_allowed integer;
  actual_count integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  limit_check := public.check_animation_limit(target_user_id);

  IF (limit_check ->> 'can_save')::boolean IS FALSE THEN
    RETURN jsonb_set(limit_check, '{error}', to_jsonb('limit_reached'::text));
  END IF;

  plan_value := (limit_check ->> 'plan')::plan_type;
  IF (limit_check ->> 'max') IS NOT NULL THEN
    max_allowed := (limit_check ->> 'max')::integer;
  END IF;

  SELECT COUNT(*) INTO actual_count FROM public.animation WHERE user_id = target_user_id;

  INSERT INTO public.usage_limits AS ul (user_id, animation_count, last_reset_at)
  VALUES (target_user_id, actual_count, timezone('utc'::text, now()))
  ON CONFLICT (user_id) DO UPDATE
    SET animation_count = excluded.animation_count,
        last_reset_at = excluded.last_reset_at
  RETURNING animation_count INTO actual_count;

  UPDATE public.profiles
     SET animation_count = actual_count,
         plan_updated_at = timezone('utc'::text, now())
   WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'can_save', TRUE,
    'current', actual_count,
    'max', max_allowed,
    'plan', plan_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_usage_v2(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_usage record;
  v_plan_limits json;
  v_over_limit_snippets integer := 0;
  v_over_limit_animations integer := 0;
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF COALESCE(v_role, '') <> 'service_role' THEN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  PERFORM ensure_usage_limits_row(p_user_id);

  WITH profile AS (
    SELECT id, plan
    FROM public.profiles
    WHERE id = p_user_id
  ),
  counts AS (
    SELECT
      p.plan,
      GREATEST(
        COALESCE(ul.snippet_count, 0),
        (SELECT COUNT(*) FROM public.snippet s WHERE s.user_id = p_user_id)
      ) AS snippet_count,
      GREATEST(
        COALESCE(ul.animation_count, 0),
        (SELECT COUNT(*) FROM public.animation a WHERE a.user_id = p_user_id)
      ) AS animation_count,
      GREATEST(
        COALESCE(ul.folder_count, 0),
        (
          SELECT COUNT(*) FROM (
            SELECT 1 FROM public.collection c WHERE c.user_id = p_user_id
            UNION ALL
            SELECT 1 FROM public.animation_collection ac WHERE ac.user_id = p_user_id
          ) folders
        )
      ) AS folder_count,
      COALESCE(ul.video_export_count, 0) AS video_export_count,
      COALESCE(ul.public_share_count, 0) AS public_share_count,
      ul.last_reset_at
    FROM profile p
    LEFT JOIN public.usage_limits ul ON ul.user_id = p.id
  )
  SELECT * INTO v_usage FROM counts;

  IF v_usage.plan IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_plan_limits := get_plan_limits(v_usage.plan);

  IF (v_plan_limits ->> 'maxSnippets') IS NOT NULL THEN
    v_over_limit_snippets := GREATEST(
      v_usage.snippet_count - (v_plan_limits ->> 'maxSnippets')::integer,
      0
    );
  END IF;

  IF (v_plan_limits ->> 'maxAnimations') IS NOT NULL THEN
    v_over_limit_animations := GREATEST(
      v_usage.animation_count - (v_plan_limits ->> 'maxAnimations')::integer,
      0
    );
  END IF;

  RETURN jsonb_build_object(
    'plan', v_usage.plan,
    'snippet_count', v_usage.snippet_count,
    'animation_count', v_usage.animation_count,
    'folder_count', v_usage.folder_count,
    'video_export_count', v_usage.video_export_count,
    'public_share_count', v_usage.public_share_count,
    'last_reset_at', v_usage.last_reset_at,
    'over_limit_snippets', v_over_limit_snippets,
    'over_limit_animations', v_over_limit_animations
  );
END;
$$;

-- Attempt to drop user_plan if no dependencies remain.
DO $$
DECLARE
  enum_dependencies integer;
BEGIN
  SELECT COUNT(*) INTO enum_dependencies
  FROM pg_depend d
  JOIN pg_type t ON d.refobjid = t.oid
  WHERE t.typname = 'user_plan'
    AND d.deptype = 'n';

  IF enum_dependencies = 0 THEN
    DROP TYPE IF EXISTS public.user_plan CASCADE;
  ELSE
    RAISE NOTICE 'user_plan enum still has dependencies, not dropping';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.check_snippet_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_animation_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_snippet_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_animation_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_usage_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_usage_v2(uuid) TO anon;
