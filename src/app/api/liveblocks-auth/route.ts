import { Liveblocks } from "@liveblocks/node";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY!;

const liveblocks = new Liveblocks({ secret: API_KEY });

export async function POST(request: Request) {
  const supabase = createServerComponentClient({
    cookies: () => cookies(),
  });

  // Get the session from Supabase
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    // Handle the error
    console.error(error);
    return new NextResponse("Error occurred", { status: 500 });
  }

  // Start an auth session inside your endpoint
  const session = liveblocks.prepareSession(data.session?.user.id ?? "", {
    userInfo: data.session?.user.user_metadata,
  });

  // Implement your own security, and give the user access to the room
  const { room } = await request.json();
  if (room && data.session?.user.id) {
    session.allow(room, session.FULL_ACCESS);
  }

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
