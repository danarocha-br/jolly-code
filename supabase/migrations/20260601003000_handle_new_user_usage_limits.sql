-- Ensure new users get an associated usage_limits row at signup time.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Precreate usage_limits row for the user to keep counters in sync.
  PERFORM ensure_usage_limits_row(new.id);

  RETURN new;
END;
$$;
