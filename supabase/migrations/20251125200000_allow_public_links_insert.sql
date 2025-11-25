-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own links." ON public.links;

-- Create a new policy allowing both authenticated users (for their own links) and anonymous users (public links) to insert
CREATE POLICY "Anyone can insert links."
ON public.links
FOR INSERT
WITH CHECK (
  ((select auth.uid()) = user_id) OR (user_id IS NULL)
);
