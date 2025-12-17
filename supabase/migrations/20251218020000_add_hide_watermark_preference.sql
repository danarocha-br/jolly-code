-- Add hide_watermark preference column to profiles table
-- This allows PRO users to hide watermarks from exports and embeds

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS hide_watermark BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient watermark preference queries
CREATE INDEX IF NOT EXISTS profiles_hide_watermark_idx ON public.profiles(hide_watermark) WHERE hide_watermark = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hide_watermark IS 'PRO plan feature: when true, watermarks are hidden from exports and embeds';

