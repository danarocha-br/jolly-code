-- Ensure immutable search_path for security-sensitive functions.

ALTER FUNCTION public.get_plan_limits(plan_type) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.check_public_share_limit(UUID) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.record_public_share_view(UUID, UUID, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.sync_stripe_subscription(UUID, plan_type, TEXT, TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
