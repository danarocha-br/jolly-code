-- Verification script for database indexes
-- Run this script to verify that indexes are being used in query plans
-- Usage: Connect to your Supabase database and run these queries

-- ============================================================================
-- CHECK EXISTING INDEXES
-- ============================================================================
-- List all indexes on tables with foreign keys

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        tablename IN ('snippet', 'collection', 'animation', 'animation_collection', 'links', 'share_view_events', 'stripe_webhook_audit')
        OR indexname LIKE '%user_id%'
        OR indexname LIKE '%created_at%'
        OR indexname LIKE '%snippet_id%'
        OR indexname LIKE '%link_id%'
    )
ORDER BY tablename, indexname;

-- ============================================================================
-- VERIFY INDEX USAGE WITH EXPLAIN ANALYZE
-- ============================================================================
-- Replace 'YOUR_USER_ID_HERE' with an actual user_id from your database
-- These queries should show "Index Scan" or "Bitmap Index Scan" in the plan

-- 1. Snippet queries by user_id
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.snippet 
WHERE user_id = 'YOUR_USER_ID_HERE' 
ORDER BY created_at DESC
LIMIT 20;

-- 2. Animation queries by user_id
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.animation 
WHERE user_id = 'YOUR_USER_ID_HERE' 
ORDER BY created_at DESC
LIMIT 20;

-- 3. Collection queries by user_id
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.collection 
WHERE user_id = 'YOUR_USER_ID_HERE' 
ORDER BY created_at DESC
LIMIT 20;

-- 4. Links lookup by short_url
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.links 
WHERE short_url = 'YOUR_SHORT_URL_HERE';

-- 5. Links by snippet_id
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.links 
WHERE snippet_id = 'YOUR_SNIPPET_ID_HERE';

-- 6. Share view events by owner
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM public.share_view_events 
WHERE owner_id = 'YOUR_USER_ID_HERE' 
ORDER BY viewed_on DESC
LIMIT 20;

-- ============================================================================
-- CHECK INDEX STATISTICS
-- ============================================================================
-- View index usage statistics (requires pg_stat_statements extension)
-- This shows which indexes are actually being used

SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('snippet', 'collection', 'animation', 'animation_collection', 'links', 'share_view_events', 'stripe_webhook_audit')
ORDER BY idx_scan DESC;

-- ============================================================================
-- CHECK FOR MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================
-- This query identifies foreign key columns that don't have indexes

SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE schemaname = tc.table_schema 
            AND tablename = tc.table_name 
            AND indexdef LIKE '%' || kcu.column_name || '%'
        ) THEN 'HAS INDEX'
        ELSE 'MISSING INDEX'
    END AS index_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- CHECK TABLE SIZES AND INDEX SIZES
-- ============================================================================
-- Monitor index sizes to ensure they're not growing too large

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('snippet', 'collection', 'animation', 'animation_collection', 'links', 'share_view_events', 'stripe_webhook_audit')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

