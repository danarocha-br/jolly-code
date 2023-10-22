import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getUsersCollectionList, insertCollection } from "@/lib/services/database";
import { validateContentType } from "@/lib/utils/validate-content-type-request";

/**
 * Retrieves a list of collections for the authenticated user.
 *
 * @return {Promise<NextResponse>} A JSON response with a status code of 200 and the list of collections in the `data` field. If an error occurs, the response will have a status code of 500 and an error message.
 */
export async function GET() {
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

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated." },
        { status: 401 }
      );
    }

    const data = await getUsersCollectionList({
      user_id,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "No collections found. Please create a collection first." },
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

/**
 * Handles the POST request and saves a collection to the database.
 *
 * @param {NextRequest} request - The incoming request object.
 * @return {Promise<NextResponse>} A promise that resolves to the response object.
 */
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  try {
    const { user_id, title, snippets } =
      await validateContentType(request).json();

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated to save a collection." },
        { status: 401 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Missing required input parameters." },
        { status: 400 }
      );
    }

    const data = await insertCollection({
      user_id: user_id || null,
      title,
      snippets,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "Failed to insert collection." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 200,
      data: data[0],
    });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
