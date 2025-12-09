-- Add billing_interval column to profiles table
-- This stores the subscription billing interval ('monthly' or 'yearly') from Stripe
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (
    billing_interval IN ('monthly', 'yearly')
  );

-- Create index for billing_interval queries
CREATE INDEX IF NOT EXISTS profiles_billing_interval_idx ON public.profiles(billing_interval);

