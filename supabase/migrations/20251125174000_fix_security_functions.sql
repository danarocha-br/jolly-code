-- Fix security warnings: function search_path fixes

-- 1. Fix Function Search Path Mutable for increment_link_visits
CREATE OR REPLACE FUNCTION increment_link_visits(link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE links
  SET visits = COALESCE(visits, 0) + 1
  WHERE id = link_id;
END;
$$;

-- 2. Fix Function Search Path Mutable for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  RETURN new;
END;
$$;
