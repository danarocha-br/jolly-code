import { NextRequest, NextResponse } from "next/server";

import { validateContentType } from "@/lib/utils/validate-content-type-request";
import {
  Snippet,
  deleteSnippet,
  getUsersSnippetsList,
  insertSnippet,
  updateSnippet,
} from "@/lib/services/database";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * Retrieves a list of snippets for the authenticated user.
 *
 * @return {Promise<object>} A JSON response containing the list of snippets.
 */
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => Promise.resolve(cookieStore),
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

    const data = await getUsersSnippetsList({
      user_id,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "No snippets found. Please create a snippet first." },
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
 * Handles the POST request to save a snippet.
 *
 * @param {NextRequest} request - The request object.
 * @return {Promise<NextResponse>} A promise that resolves to the response object.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => Promise.resolve(cookieStore),
  });

  try {
    const { id, title, code, language, user_id, url } =
      await validateContentType(request).json();

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated to save a snippet." },
        { status: 401 }
      );
    }

    if (!id || !code || !language) {
      return NextResponse.json(
        { error: "Missing required input parameters." },
        { status: 400 }
      );
    }

    const data = await insertSnippet({
      id,
      user_id: user_id || null,
      title,
      code,
      language,
      url,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "Failed to insert snippet." },
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

/**
 * Deletes a snippet from the database.
 *
 * @param {NextRequest} request - The incoming request object.
 * @return {Promise<NextResponse>} A promise that resolves to a NextResponse object.
 */
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => Promise.resolve(cookieStore),
  });

  try {
    const { snippet_id, user_id } = await validateContentType(request).json();

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated to save a snippet." },
        { status: 401 }
      );
    }

    if (!snippet_id) {
      return NextResponse.json(
        { error: "Snippet id is missing." },
        { status: 400 }
      );
    }

    await deleteSnippet({
      snippet_id,
      user_id,
      supabase,
    });

    return NextResponse.json({
      status: 200,
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
 * Handles PUT requests to update a snippet.
 *
 * @param {NextRequest} request - The request object.
 * @return {Promise<NextResponse>} A promise that resolves to the response object.
 */
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => Promise.resolve(cookieStore),
  });

  try {
    const { id: snippet_id, title, code, language, user_id, url } =
      await validateContentType(request).json();

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated to updated a snippet." },
        { status: 401 }
      );
    }

    if (!snippet_id) {
      return NextResponse.json(
        { error: "Missing snippet id in the request." },
        { status: 400 }
      );
    }

    const data: Snippet[] = await updateSnippet({
      id: snippet_id,
      user_id: user_id || null,
      title,
      code,
      language,
      url,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "Failed to update snippet." },
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
