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

  // Only include trusted origins from configuration
  const allowedOrigins = [
    process.env.CORS_ALLOWED_ORIGIN ?? "",
    process.env.NEXT_PUBLIC_APP_URL ?? "",
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => origin !== null);

  const candidate = normalizeOrigin(requestOrigin ?? refererOrigin);

  if (!candidate) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  if (!allowedOrigins.includes(candidate)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  return null;
};

export const proxy = wrapMiddlewareWithSentry(async function proxy(request: NextRequest) {
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
