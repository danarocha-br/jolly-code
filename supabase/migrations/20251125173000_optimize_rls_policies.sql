-- Optimize RLS policies to prevent auth.uid() re-evaluation for each row
-- This improves query performance at scale by evaluating auth.uid() once per query

-- Drop and recreate all policies with optimized auth.uid() calls

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." 
ON public.profiles 
FOR INSERT 
WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." 
ON public.profiles 
FOR UPDATE 
USING ((select auth.uid()) = id);

-- ============================================================================
-- SNIPPET TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own snippets." ON public.snippet;
CREATE POLICY "Users can view own snippets." 
ON public.snippet 
FOR SELECT 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own snippets." ON public.snippet;
CREATE POLICY "Users can insert own snippets." 
ON public.snippet 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own snippets." ON public.snippet;
CREATE POLICY "Users can update own snippets." 
ON public.snippet 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own snippets." ON public.snippet;
CREATE POLICY "Users can delete own snippets." 
ON public.snippet 
FOR DELETE 
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- COLLECTION TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own collections." ON public.collection;
CREATE POLICY "Users can view own collections." 
ON public.collection 
FOR SELECT 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own collections." ON public.collection;
CREATE POLICY "Users can insert own collections." 
ON public.collection 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own collections." ON public.collection;
CREATE POLICY "Users can update own collections." 
ON public.collection 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own collections." ON public.collection;
CREATE POLICY "Users can delete own collections." 
ON public.collection 
FOR DELETE 
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- LINKS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own links." ON public.links;
CREATE POLICY "Users can insert own links." 
ON public.links 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own links." ON public.links;
CREATE POLICY "Users can update own links." 
ON public.links 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own links." ON public.links;
CREATE POLICY "Users can delete own links." 
ON public.links 
FOR DELETE 
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- ADD INDEXES FOR FOREIGN KEYS
-- ============================================================================
-- These indexes improve query performance for foreign key lookups

CREATE INDEX IF NOT EXISTS idx_snippet_user_id ON public.snippet(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_user_id ON public.collection(user_id);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON public.links(user_id);
