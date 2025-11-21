import { NextRequest, NextResponse } from "next/server";

import { getSnippetById } from "@/lib/services/database";
import { createClient } from "@/utils/supabase/server";

/**
 * Retrieves the snippet by given ID for the authenticated user.
 *
 * @return {Promise<object>} A JSON response containing the snippet data.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

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

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);

    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "No snippet id was provided." },
        { status: 400 }
      );
    }

    const data = await getSnippetById({
      user_id,
      snippet_id: id,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "Snippet was not found. Please create a snippet first." },
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
