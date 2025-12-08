import { applyRequestContextToSentry, applyResponseContextToSentry } from "@/lib/sentry-context";
import { createClient } from "@/utils/supabase/server";
import { Liveblocks } from "@liveblocks/node";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { authedLimiter, enforceRateLimit } from "@/lib/arcjet/limiters";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({ secret: API_KEY });

export const POST = wrapRouteHandlerWithSentry(
  async function POST(request: NextRequest) {
    applyRequestContextToSentry({ request });
    const limitResponse = await enforceRateLimit(authedLimiter, request, {
      tags: ["liveblocks-auth"],
    });
    if (limitResponse) return limitResponse;

    const supabase = await createClient();

    // Get the user from Supabase (authenticated)

    const { data } = await supabase.auth.getUser();

    let userId = "anonymous";
    if (data && data.user?.id) {
      userId = data.user.id;

      const userLimited = await enforceRateLimit(authedLimiter, request, {
        userId,
        tags: ["liveblocks-auth", "user"],
      });
      if (userLimited) return userLimited;
    }

    applyRequestContextToSentry({
      request,
      userId,
      featureFlags: data?.user?.user_metadata?.feature_flags,
      locale: data?.user?.user_metadata?.locale,
    });

    const session = liveblocks.prepareSession(userId, {
      userInfo: data?.user?.user_metadata || {},
    });

    const { room } = await request.json();
    if (room) session.allow(room, session.FULL_ACCESS);

    // Authorize the user and return the result
    try {
      const { status, body } = await session.authorize();
      applyResponseContextToSentry(status);
      return new NextResponse(body, { status });
    } catch (e) {
      console.error("Error authorizing session:", e);
      applyResponseContextToSentry(500);
    }
  },
  {
    method: "POST",
    parameterizedRoute: "/api/liveblocks-auth",
  },
);
