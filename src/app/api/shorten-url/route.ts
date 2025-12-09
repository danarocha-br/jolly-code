import { isValidURL } from "@/lib/utils/is-valid-url";
import { validateContentType } from "@/lib/utils/validate-content-type-request";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { enforceRateLimit, publicLimiter, strictLimiter } from "@/lib/arcjet/limiters";
import { withAuthRoute } from "@/lib/auth/with-auth-route";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database";

export const runtime = "edge";

const VIEWER_COOKIE = "jc_viewer_token";

/**
 * Sets the viewer cookie on a NextResponse with consistent options.
 *
 * @param {NextResponse} response - The NextResponse to set the cookie on
 * @param {string} token - The viewer token to set
 */
function setViewerCookie(response: NextResponse, token: string): void {
  response.cookies.set(VIEWER_COOKIE, token, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Retrieves the URL associated with a given slug.
 *
 * @param {NextRequest} request - an url
 * @return {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the URL associated with the slug, or an error response if the slug is invalid or not found.
 */
export async function GET(request: NextRequest) {
  const limitResponse = await enforceRateLimit(publicLimiter, request, {
    tags: ["shorten-url:get"],
  });
  if (limitResponse) return limitResponse;

  const supabase = await createClient();
  const url = new URL(request.url);

  const slug = url.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "No slug was provided." },
      { status: 400 }
    );
  }

  let data;
  let error;
  try {
    const result = await supabase
      .from("links")
      .select("id, url, title, description, user_id")
      .eq("short_url", slug);

    data = result.data;

    error = result.error;
  } catch (error: Error | any) {
    error = error.message;
  }

  if (!data || !data[0]) {
    return NextResponse.json({ error: "URL not found." }, { status: 404 });
  }

  const link = data[0];

  const cookieStore = await cookies();
  let viewerToken = cookieStore.get(VIEWER_COOKIE)?.value;

  if (!viewerToken) {
    viewerToken = nanoid(24);
  }

  let viewResult: Database['public']['Functions']['record_public_share_view']['Returns'] | null = null;

  // Only record view if user_id is present
  if (link.user_id && link.id) {
    try {
      const { data: recordViewData, error: recordViewError } = await supabase.rpc(
        "record_public_share_view",
        { p_owner_id: link.user_id, p_link_id: link.id, p_viewer_token: viewerToken }
      );

      if (recordViewError) {
        throw recordViewError;
      }

      viewResult = recordViewData ?? null;
    } catch (recordError) {
      console.error("Failed to record share view", recordError);
    }
  }

  if (viewResult && viewResult.allowed === false) {
    const response = NextResponse.json(
      {
        error: "View limit reached for this shared link.",
        current: viewResult.current ?? null,
        max: viewResult.max ?? null,
        plan: viewResult.plan ?? null,
      },
      { status: 429 }
    );

    if (!cookieStore.get(VIEWER_COOKIE)?.value && viewerToken) {
      setViewerCookie(response, viewerToken);
    }

    return response;
  }

  const response = NextResponse.json({
    status: 200,
    id: link.id,
    url: link.url,
  });

  if (!cookieStore.get(VIEWER_COOKIE)?.value && viewerToken) {
    setViewerCookie(response, viewerToken);
  }

  return response;
}

export const POST = withAuthRoute(async function POST({ request, supabase, user }) {
  const limitResponse = await enforceRateLimit(publicLimiter, request, {
    tags: ["shorten-url:create"],
  });
  if (limitResponse) return limitResponse;

  try {
    const validated = validateContentType(request);
    if (validated instanceof NextResponse) {
      return validated;
    }

    const { url, snippet_id, title, description } = await request.json();

    const longUrl = url ? url : null;
    const isInternalPayload = typeof longUrl === "string" && longUrl.startsWith("animation:");
    const validURL = isInternalPayload || await isValidURL(longUrl);

    if (!validURL) {
      return NextResponse.json(
        { message: `${longUrl} is not a valid url.` },
        { status: 400 }
      );
    }

    const userLimited = await enforceRateLimit(strictLimiter, request, {
      userId: user.id,
      tags: ["shorten-url:create", "user"],
    });
    if (userLimited) return userLimited;

    const { data: existingUrl, error } = await supabase
      .from("links")
      .select("url, short_url, title, description, user_id")
      .eq("url", longUrl);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const existing = existingUrl?.[0];

    // If the current user already owns this link, allow reuse without consuming quota
    if (existing && existing.user_id === user.id) {
      if (title || description) {
        try {
          await supabase
            .from("links")
            .update({
              title: title ?? existing.title ?? null,
              description: description ?? existing.description ?? null,
            })
            .eq("short_url", existing.short_url);
        } catch (updateError) {
          console.error("Failed to update link metadata", updateError);
        }
      }

      return NextResponse.json({
        status: 200,
        short_url: existing.short_url,
      });
    }

    if (existing) {
      return NextResponse.json({
        status: 200,
        short_url: existing.short_url,
      });
    }

    // Retry loop to handle potential unique constraint violations
    const maxRetries = 5;
    let shortUrl: string | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      shortUrl = nanoid(5);

      const { error: insertError } = await supabase
        .from("links")
        .insert([
          {
            user_id: user.id,
            url: longUrl,
            short_url: shortUrl,
            snippet_id: snippet_id ? snippet_id : null,
            title: title ?? null,
            description: description ?? null,
          },
        ]);

      if (!insertError) {
        // Success - return the short URL
        return NextResponse.json({
          status: 200,
          short_url: shortUrl,
        });
      }

      // Check if it's a unique constraint violation (PostgreSQL error code 23505)
      const isUniqueViolation =
        insertError.code === "23505" ||
        insertError.message?.toLowerCase().includes("unique") ||
        insertError.message?.toLowerCase().includes("duplicate");

      if (!isUniqueViolation) {
        // Not a duplicate key error - return the error
        console.error("Insert Error:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // If it's the last attempt, return error
      if (attempt === maxRetries - 1) {
        console.error("Failed to generate unique short URL after retries:", insertError);
        return NextResponse.json(
          { error: "Failed to generate unique short URL. Please try again." },
          { status: 500 }
        );
      }

      // Otherwise, retry with a new key
    }

    // This should never be reached, but TypeScript requires it
    return NextResponse.json(
      { error: "Failed to generate short URL" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Shorten URL Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
