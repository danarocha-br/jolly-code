import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { enforceRateLimit, publicLimiter } from "@/lib/arcjet/limiters";
import { captureServerEvent } from "@/lib/services/tracking/server";
import { AUTH_EVENTS } from "@/lib/services/tracking/events";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const limitResponse = await enforceRateLimit(publicLimiter, request, {
    tags: ["auth:logout"],
  });
  if (limitResponse) return limitResponse;

  const requestUrl = new URL(request.url);
  const supabase = await createClient();

  // Get user before signing out
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  // Track logout (non-blocking to avoid delaying redirect)
  if (user) {
    void captureServerEvent(AUTH_EVENTS.LOGOUT, {
      userId: user.id,
      requestMetadata: {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });
  }

  return NextResponse.redirect(`${requestUrl.origin}/`, {
    status: 301,
  });
}
