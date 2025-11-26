import { applyRequestContextToSentry, applyResponseContextToSentry } from "@/lib/sentry-context";
import { createClient } from "@/utils/supabase/server";
import { Liveblocks } from "@liveblocks/node";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({ secret: API_KEY });

export const POST = wrapRouteHandlerWithSentry(async function POST(
  request: NextRequest,
) {
  applyRequestContextToSentry({ request });

  const supabase = await createClient();

  // Get the session from Supabase

  const { data } = await supabase.auth.getSession();

  let userId = "anonymous";
  if (data && data.session?.user?.id) {
    userId = data.session?.user.id;
  }

  applyRequestContextToSentry({
    request,
    userId,
    featureFlags: data?.session?.user?.user_metadata?.feature_flags,
    locale: data?.session?.user?.user_metadata?.locale,
  });

  const session = liveblocks.prepareSession(userId, {
    userInfo: data?.session?.user?.user_metadata || {},
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
});
