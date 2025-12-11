import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { enforceRateLimit, publicLimiter } from "@/lib/arcjet/limiters";

export async function POST(request: Request) {
  const limitResponse = await enforceRateLimit(publicLimiter, request, {
    tags: ["auth:logout"],
  });
  if (limitResponse) return limitResponse;

  const requestUrl = new URL(request.url);
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/`, {
    status: 301,
  });
}
