-- Fix security warnings from Supabase advisors

-- 1. Fix Function Search Path Mutable for increment_link_visits
-- This prevents search_path manipulation attacks
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
-- This prevents search_path manipulation attacks
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

-- 3. Enable Leaked Password Protection
-- This prevents users from using passwords that have been leaked in data breaches
ALTER ROLE authenticator SET app.settings.enable_password_leak_protection = 'on';
