-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own links." ON "public"."links";

-- Create a new policy allowing public read access
CREATE POLICY "Public can view links."
ON "public"."links"
FOR SELECT
USING (true);

-- Create a secure function to increment visits
CREATE OR REPLACE FUNCTION increment_link_visits(link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE links
  SET visits = COALESCE(visits, 0) + 1
  WHERE id = link_id;
END;
$$;
