import { NextRequest, NextResponse } from "next/server";

import { validateContentType } from "@/lib/utils/validate-content-type-request";
import {
  deleteSnippet,
  getSnippetByMatchingUrl,
  insertSnippet,
} from "@/lib/services/database";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { isValidURL } from "@/lib/utils/is-valid-url";

/**
 * Retrieves data from the server based on the provided URL and user authentication.
 *
 * @param {NextRequest} request - The request object containing information about the HTTP request.
 * @return {Promise<NextResponse>} A promise that resolves to the response object containing the retrieved data.
 */
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  try {
    const current_url = new URL(request.url);
    const url = current_url.searchParams.get("url")!;
    const currentUser = await supabase.auth.getUser();
    const user_id = currentUser.data.user?.id;

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated." },
        { status: 401 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: "No URL was provided." },
        { status: 400 }
      );
    }

    if (!isValidURL(url)) {
      return NextResponse.json({ error: "Invalid url." }, { status: 400 });
    }

    const data = await getSnippetByMatchingUrl({
      current_url: url,
      user_id,
      supabase,
    });

    if (!data) {
      return NextResponse.json({ error: "No snippet found." }, { status: 500 });
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
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
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
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
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
