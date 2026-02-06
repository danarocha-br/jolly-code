import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import { enforceRateLimit, publicLimiter } from "@/lib/arcjet/limiters";
import { captureServerEvent } from "@/lib/services/tracking/server";
import { AUTH_EVENTS } from "@/lib/services/tracking/events";

export async function GET(request: NextRequest) {
  const limitResponse = await enforceRateLimit(publicLimiter, request, {
    tags: ["auth:callback"],
  });
  if (limitResponse) return limitResponse;

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Track login failure (non-blocking)
      void captureServerEvent(AUTH_EVENTS.LOGIN_FAILED, {
        properties: {
          error_message: error.message,
          provider: 'github',
        },
        requestMetadata: {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      });
      
      // Redirect to home with error parameter
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }

    if (data.session && data.user) {
      // Check if this is a new user (signup) by checking if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', data.user.id)
        .single();

      const isNewUser = profile && new Date(profile.created_at).getTime() > Date.now() - 60000; // Created within last minute

      // Track login success (non-blocking to avoid delaying redirect)
      void captureServerEvent(AUTH_EVENTS.LOGIN_SUCCESS, {
        userId: data.user.id,
        properties: {
          provider: 'github',
          is_new_user: isNewUser,
        },
        requestMetadata: {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      });

      // Track signup if new user (non-blocking)
      if (isNewUser) {
        void captureServerEvent(AUTH_EVENTS.SIGNUP_DETECTED, {
          userId: data.user.id,
          properties: {
            provider: 'github',
          },
          requestMetadata: {
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        });
      }
    }

    // Session established successfully - tracking already done above
  }

  // URL to redirect to after sign in process completes
  const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } else if (forwardedHost) {
    return NextResponse.redirect(new URL(next, `https://${forwardedHost}`));
  } else {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }
}
