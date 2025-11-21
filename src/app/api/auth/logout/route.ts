import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({
    cookies: () => Promise.resolve(cookieStore),
  });

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/`, {
    status: 301,
  });
}
