-- Add indexes on foreign keys and composite indexes for common query patterns
-- This migration addresses missing indexes on foreign key columns and optimizes
-- queries that filter by user_id and order by created_at

-- ============================================================================
-- FOREIGN KEY INDEXES
-- ============================================================================
-- Add indexes on foreign key columns that don't already have them

-- Links table: snippet_id foreign key
CREATE INDEX IF NOT EXISTS idx_links_snippet_id ON public.links(snippet_id);

-- Share view events: link_id foreign key (already has unique composite, but add single column for lookups)
CREATE INDEX IF NOT EXISTS idx_share_view_events_link_id ON public.share_view_events(link_id);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================
-- These indexes optimize queries that filter by user_id and order by created_at
-- which is a very common pattern in the application

-- Snippet table: user_id + created_at (for listing user's snippets by date)
CREATE INDEX IF NOT EXISTS idx_snippet_user_id_created_at ON public.snippet(user_id, created_at DESC);

-- Collection table: user_id + created_at (for listing user's collections by date)
CREATE INDEX IF NOT EXISTS idx_collection_user_id_created_at ON public.collection(user_id, created_at DESC);

-- Animation table: user_id + created_at (for listing user's animations by date)
CREATE INDEX IF NOT EXISTS idx_animation_user_id_created_at ON public.animation(user_id, created_at DESC);

-- Animation collection table: user_id + created_at (for listing user's animation collections by date)
CREATE INDEX IF NOT EXISTS idx_animation_collection_user_id_created_at ON public.animation_collection(user_id, created_at DESC);

-- Links table: user_id + created_at (for listing user's links by date)
CREATE INDEX IF NOT EXISTS idx_links_user_id_created_at ON public.links(user_id, created_at DESC);

-- Share view events: owner_id + viewed_on (already exists, but ensure it's optimal)
-- The existing index share_view_events_owner_idx covers (owner_id, viewed_on)
-- This is good, but we can add a DESC version if needed for recent-first queries
CREATE INDEX IF NOT EXISTS idx_share_view_events_owner_viewed_on_desc ON public.share_view_events(owner_id, viewed_on DESC);

-- ============================================================================
-- ADDITIONAL TIME-BASED INDEXES
-- ============================================================================
-- Indexes on created_at columns for time-based queries and analytics

-- Snippet table: created_at (for global time-based queries)
CREATE INDEX IF NOT EXISTS idx_snippet_created_at ON public.snippet(created_at DESC);

-- Animation table: created_at (for global time-based queries)
CREATE INDEX IF NOT EXISTS idx_animation_created_at ON public.animation(created_at DESC);

-- Links table: created_at (for time-based link analytics)
CREATE INDEX IF NOT EXISTS idx_links_created_at ON public.links(created_at DESC);

-- Collection table: created_at (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_collection_created_at ON public.collection(created_at DESC);

-- Animation collection table: created_at (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_animation_collection_created_at ON public.animation_collection(created_at DESC);

-- ============================================================================
-- ADDITIONAL QUERY OPTIMIZATION INDEXES
-- ============================================================================
-- Indexes for other common query patterns

-- Links table: short_url (for quick lookups when resolving shared links)
CREATE INDEX IF NOT EXISTS idx_links_short_url ON public.links(short_url);

-- Links table: snippet_id + user_id (for queries that filter by both)
CREATE INDEX IF NOT EXISTS idx_links_snippet_user ON public.links(snippet_id, user_id) WHERE snippet_id IS NOT NULL;

-- Stripe webhook audit: user_id (for filtering webhooks by user)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_audit_user_id ON public.stripe_webhook_audit(user_id) WHERE user_id IS NOT NULL;

-- Usage drift alerts: user_id + created_at (for listing alerts by user and date)
CREATE INDEX IF NOT EXISTS idx_usage_drift_alerts_user_created_at ON public.usage_drift_alerts(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ============================================================================
-- Uncomment and run these queries to verify index usage:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM public.snippet 
-- WHERE user_id = 'some-uuid' 
-- ORDER BY created_at DESC;
--
-- EXPLAIN ANALYZE
-- SELECT * FROM public.animation 
-- WHERE user_id = 'some-uuid' 
-- ORDER BY created_at DESC;
--
-- EXPLAIN ANALYZE
-- SELECT * FROM public.links 
-- WHERE short_url = 'some-short-url';
--
-- EXPLAIN ANALYZE
-- SELECT * FROM public.share_view_events 
-- WHERE owner_id = 'some-uuid' 
-- ORDER BY viewed_on DESC;

