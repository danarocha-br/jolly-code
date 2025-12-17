import { updateSession } from "@/utils/supabase/middleware";
import { wrapMiddlewareWithSentry } from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = ["/api/webhooks/stripe"];

const isCsrfExempt = (pathname: string) =>
  CSRF_EXEMPT_PATHS.some((path) => pathname.startsWith(path));

const getRequestOrigin = (request: NextRequest) => {
  const originHeader = request.headers.get("origin");
  return originHeader ?? null;
};

const normalizeOrigin = (origin: string | null): string | null => {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    // Normalize to scheme+host+port (port is included if not default)
    const port = url.port ? `:${url.port}` : "";
    return `${url.protocol}//${url.hostname}${port}`;
  } catch {
    return null;
  }
};

const enforceCsrf = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/") || SAFE_METHODS.has(request.method)) {
    return null;
  }

  if (isCsrfExempt(pathname)) {
    return null;
  }

  const requestOrigin = getRequestOrigin(request);
  const refererOrigin = (() => {
    const referer = request.headers.get("referer");
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  })();

  // Get the current request's origin (for same-origin requests)
  const currentRequestOrigin = (() => {
    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || 
                     (request.nextUrl.protocol === "https:" ? "https" : "http");
    if (!host) return null;
    try {
      return normalizeOrigin(`${protocol}://${host}`);
    } catch {
      return null;
    }
  })();

  // Only include trusted origins from configuration
  const allowedOrigins = [
    process.env.CORS_ALLOWED_ORIGIN ?? "",
    process.env.NEXT_PUBLIC_APP_URL ?? "",
    currentRequestOrigin, // Allow same-origin requests
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => origin !== null);

  const candidate = normalizeOrigin(requestOrigin ?? refererOrigin);

  if (!candidate) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  // Check if origin is explicitly allowed
  if (allowedOrigins.includes(candidate)) {
    return null;
  }

  // Allow this project's Vercel preview URLs
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    const normalizedVercelUrl = normalizeOrigin(`https://${vercelUrl}`);
    if (normalizedVercelUrl && candidate === normalizedVercelUrl) {
      return null;
    }
    // Also allow branch/PR previews sharing the same project pattern
    const projectSlug = vercelUrl.split("-").slice(-2).join("-"); // e.g., "jolly-code"
    if (candidate.includes(projectSlug) && candidate.endsWith(".vercel.app")) {
      return null;
    }
  }

  return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
};

const getAllowedOriginForCors = (request: NextRequest): string => {
  const requestOrigin = request.headers.get("origin");
  
  // Get current request origin
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || 
                   (request.nextUrl.protocol === "https:" ? "https" : "http");
  const currentOrigin = host ? normalizeOrigin(`${protocol}://${host}`) : null;
  const normalizedRequestOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : null;

  // Allow same-origin requests
  if (normalizedRequestOrigin && normalizedRequestOrigin === currentOrigin && requestOrigin) {
    return requestOrigin;
  }

  // Check configured origins
  const configuredOrigins = [
    process.env.CORS_ALLOWED_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => origin !== null);

  if (normalizedRequestOrigin && configuredOrigins.includes(normalizedRequestOrigin) && requestOrigin) {
    return requestOrigin;
  }

  // Allow Vercel preview URLs (same logic as CSRF check)
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl && normalizedRequestOrigin && requestOrigin) {
    const normalizedVercelUrl = normalizeOrigin(`https://${vercelUrl}`);
    if (normalizedVercelUrl && normalizedRequestOrigin === normalizedVercelUrl) {
      return requestOrigin;
    }
    // Also allow branch/PR previews sharing the same project pattern
    const projectSlug = vercelUrl.split("-").slice(-2).join("-");
    if (normalizedRequestOrigin.includes(projectSlug) && normalizedRequestOrigin.endsWith(".vercel.app")) {
      return requestOrigin;
    }
  }

  // Default: return request origin (or current origin if no request origin)
  // This allows same-origin requests even without origin header
  return requestOrigin || (host ? `${protocol}://${host}` : "*");
};

export const proxy = wrapMiddlewareWithSentry(async function proxy(request: NextRequest) {
  // Handle OPTIONS (CORS preflight) requests explicitly
  if (request.method === "OPTIONS") {
    const allowedOrigin = getAllowedOriginForCors(request);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  return await updateSession(request);
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
