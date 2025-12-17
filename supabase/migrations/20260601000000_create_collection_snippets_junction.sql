
-- Create collection_snippets junction table
-- This migration replaces the JSONB array approach with a proper junction table
-- for better queryability, data integrity, and scalability

-- ============================================================================
-- CREATE JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.collection_snippets (
  collection_id uuid NOT NULL REFERENCES public.collection(id) ON DELETE CASCADE,
  snippet_id uuid NOT NULL REFERENCES public.snippet(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (collection_id, snippet_id)
);

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on collection_id for queries like "get all snippets in a collection"
CREATE INDEX IF NOT EXISTS idx_collection_snippets_collection_id 
  ON public.collection_snippets(collection_id);

-- Index on snippet_id for queries like "find all collections containing a snippet"
CREATE INDEX IF NOT EXISTS idx_collection_snippets_snippet_id 
  ON public.collection_snippets(snippet_id);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_collection_snippets_collection_created 
  ON public.collection_snippets(collection_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.collection_snippets ENABLE ROW LEVEL SECURITY;

-- Users can view collection_snippets for collections they own
CREATE POLICY "Users can view own collection snippets" 
  ON public.collection_snippets 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.collection 
      WHERE collection.id = collection_snippets.collection_id 
      AND collection.user_id = (SELECT auth.uid())
    )
  );

-- Users can insert collection_snippets for collections they own
CREATE POLICY "Users can insert own collection snippets" 
  ON public.collection_snippets 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collection 
      WHERE collection.id = collection_snippets.collection_id 
      AND collection.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.snippet 
      WHERE snippet.id = collection_snippets.snippet_id 
      AND snippet.user_id = (SELECT auth.uid())
    )
  );

-- Users can delete collection_snippets for collections they own
CREATE POLICY "Users can delete own collection snippets" 
  ON public.collection_snippets 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.collection 
      WHERE collection.id = collection_snippets.collection_id 
      AND collection.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================
-- Migrate existing data from collection.snippets JSONB array to junction table

DO $$
DECLARE
  collection_record RECORD;
  snippet_id_value text;
  snippet_uuid uuid;
BEGIN
  -- Loop through all collections
  FOR collection_record IN 
    SELECT id, snippets, user_id 
    FROM public.collection 
    WHERE snippets IS NOT NULL 
    AND array_length(snippets, 1) > 0
  LOOP
    -- Loop through each snippet ID in the array
    -- jsonb[] is a PostgreSQL array of JSONB values, so we unnest and extract text from each JSONB element
    FOR snippet_id_value IN 
      SELECT (unnest(collection_record.snippets)::text)
    LOOP
      -- Try to convert to UUID and insert if valid
      -- Remove quotes if the JSONB value is a string
      BEGIN
        snippet_uuid := trim(both '"' from snippet_id_value)::uuid;
        
        -- Verify the snippet exists and belongs to the same user
        IF EXISTS (
          SELECT 1 FROM public.snippet 
          WHERE id = snippet_uuid 
          AND user_id = collection_record.user_id
        ) THEN
          -- Insert into junction table (ignore if already exists)
          INSERT INTO public.collection_snippets (collection_id, snippet_id, created_at)
          VALUES (collection_record.id, snippet_uuid, NOW())
          ON CONFLICT (collection_id, snippet_id) DO NOTHING;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Skip invalid UUIDs or other errors
        RAISE NOTICE 'Skipping invalid snippet ID: %', snippet_id_value;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify migration by comparing counts
-- (This is informational - actual verification should be done manually)

DO $$
DECLARE
  jsonb_count integer;
  junction_count integer;
BEGIN
  -- Count snippets in JSONB arrays
  SELECT COALESCE(SUM(array_length(snippets, 1)), 0) INTO jsonb_count
  FROM public.collection
  WHERE snippets IS NOT NULL;
  
  -- Count records in junction table
  SELECT COUNT(*) INTO junction_count
  FROM public.collection_snippets;
  
  RAISE NOTICE 'Migration complete: % snippets in JSONB arrays, % records in junction table', 
    jsonb_count, junction_count;
END $$;

