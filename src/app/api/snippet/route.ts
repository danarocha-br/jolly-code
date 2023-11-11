import { NextRequest, NextResponse } from "next/server";

import { getSnippetById } from "@/lib/services/database";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Retrieves a list of snippets for the authenticated user.
 *
 * @return {Promise<object>} A JSON response containing the list of snippets.
 */
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  try {
    let currentUser;
    try {
      currentUser = await supabase.auth.getUser();
    } catch (error) {
      console.error("Error getting user:", error);
      return NextResponse.json(
        {
          error:
            "An error occurred while getting user. Please try again later.",
        },
        { status: 500 }
      );
    }
    const user_id = currentUser.data.user?.id;

    const url = new URL(request.url);
    const snippet_id = url.searchParams.get("id");

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated." },
        { status: 401 }
      );
    }

    if (!snippet_id) {
      return NextResponse.json(
        { error: "Snippet id must be provided." },
        { status: 400 }
      );
    }

    const data = await getSnippetById({
      user_id,
      snippet_id,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "Snippet not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 200,
      data,
    });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
