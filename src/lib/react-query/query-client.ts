import {
    isServer,
    QueryClient,
    defaultShouldDehydrateQuery,
} from '@tanstack/react-query'
import * as Sentry from '@sentry/nextjs'

function makeQueryClient() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
            dehydrate: {
                // include pending queries in dehydration
                shouldDehydrateQuery: (query) =>
                    defaultShouldDehydrateQuery(query) ||
                    query.state.status === 'pending',
            },
        },
    })

    // Set up error handling using queryCache subscription (React Query v5 API)
    queryClient.getQueryCache().subscribe((event) => {
        // Check for 'updated' events where the query has an error state
        if (event?.type === 'updated' && event?.query && event.query.state.status === 'error') {
            const error = event.query.state.error
            const query = event.query

            // Skip Sentry reporting in development
            const shouldReportToSentry = process.env.NODE_ENV === 'production'

            // Report React Query errors to Sentry
            // This catches errors that might be swallowed by React Query
            if (error instanceof Error) {
                const isClient = !isServer
                
                if (isClient && shouldReportToSentry) {
                    // Client-side: use withScope and flush
                    Sentry.withScope((scope) => {
                        scope.setLevel('error');
                        scope.setTag('error_source', 'react_query');
                        scope.setTag('query_key', JSON.stringify(query.queryKey));
                        scope.setContext('react_query_error', {
                            query_key: query.queryKey,
                            query_hash: query.queryHash,
                            error_message: error.message,
                            error_name: error.name,
                        });
                        scope.setExtra('query_key', query.queryKey);
                        scope.setExtra('query_hash', query.queryHash);
                        
                        Sentry.captureException(error);
                        
                        // Flush to ensure event is sent immediately on client-side
                        Sentry.flush(2000).catch((flushError) => {
                            console.warn('[React Query] Sentry flush failed:', flushError);
                        });
                    });
                } else if (isServer && shouldReportToSentry) {
                    // Server-side: simpler capture
                    Sentry.captureException(error, {
                        level: 'error',
                        tags: {
                            error_source: 'react_query',
                            query_key: JSON.stringify(query.queryKey),
                        },
                        extra: {
                            query_key: query.queryKey,
                            query_hash: query.queryHash,
                        },
                    });
                }
            }
            
            // Also log to console for debugging
            console.error('[React Query] Query error:', {
                query_key: query.queryKey,
                error: error,
            });
        }
    })

    return queryClient
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
    if (isServer) {
        // Server: always make a new query client
        return makeQueryClient()
    } else {
        // Browser: make a new query client if we don't already have one
        // This is very important, so we don't re-make a new client if React
        // suspends during the initial render. This may not be needed if we
        // have a suspense boundary BELOW the creation of the query client
        if (!browserQueryClient) browserQueryClient = makeQueryClient()
        return browserQueryClient
    }
}
