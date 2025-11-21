import { Liveblocks } from "@liveblocks/node";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({ secret: API_KEY });

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({
    cookies: () => cookieStore as any,
  });

  // Get the session from Supabase

  const { data } = await supabase.auth.getSession();

  let userId = "anonymous";
  if (data && data.session?.user?.id) {
    userId = data.session?.user.id;
  }

  const session = liveblocks.prepareSession(userId, {
    userInfo: data?.session?.user?.user_metadata || {},
  });

  const { room } = await request.json();
  if (room) session.allow(room, session.FULL_ACCESS);

  // Authorize the user and return the result
  try {
    const { status, body } = await session.authorize();
    return new NextResponse(body, { status });
  } catch (e) {
    console.error("Error authorizing session:", e);
  }
}
