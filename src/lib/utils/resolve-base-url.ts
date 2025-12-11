/**
 * Headers-like object that has a get method
 */
type HeadersLike = {
  get(name: string): string | null;
};

/**
 * Resolves the base URL for the application server-safely.
 * 
 * Priority:
 * 1. Server-side env var (SERVER_BASE_URL or INTERNAL_API_URL)
 * 2. Constructed from request headers (X-Forwarded-Proto and Host/X-Forwarded-Host)
 * 3. Fallback to NEXT_PUBLIC_APP_URL (for client-side calls)
 * 4. Last resort: localhost:3000 (development only)
 * 
 * @param headers - Optional headers object from NextRequest or Next.js headers() (for API routes)
 * @returns The base URL (e.g., "https://example.com")
 */
export function resolveBaseUrl(headers?: HeadersLike | null): string {
  // Priority 1: Server-side environment variables (not exposed to client)
  const serverBaseUrl = process.env.SERVER_BASE_URL || process.env.INTERNAL_API_URL;
  if (serverBaseUrl) {
    return serverBaseUrl;
  }

  // Priority 2: Construct from request headers if available
  if (headers) {
    const forwardedHost = headers.get('x-forwarded-host') || headers.get('host');
    const forwardedProto = headers.get('x-forwarded-proto') || 'https';
    
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }
  }

  // Priority 3: Public env var (for client-side server actions)
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (publicAppUrl) {
    return publicAppUrl;
  }

  // Priority 4: Development fallback
  return 'http://localhost:3000';
}

