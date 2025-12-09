import {
  applyRequestContextToSentry,
  applyResponseContextToSentry,
} from "@/lib/sentry-context";
import { isValidURL } from "@/lib/utils/is-valid-url";
import { validateContentType } from "@/lib/utils/validate-content-type-request";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { enforceRateLimit, publicLimiter, strictLimiter } from "@/lib/arcjet/limiters";
import { withAuthRoute } from "@/lib/auth/with-auth-route";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database";

export const runtime = "edge";

/**
 * Retrieves the URL associated with a given slug.
 *
 * @param {NextRequest} request - an url
 * @return {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the URL associated with the slug, or an error response if the slug is invalid or not found.
 */
export const GET = wrapRouteHandlerWithSentry(
  async function GET(request: NextRequest) {
    applyRequestContextToSentry({ request });
    const limitResponse = await enforceRateLimit(publicLimiter, request, {
      tags: ["shorten-url:get"],
    });
    if (limitResponse) return limitResponse;

    const supabase = await createClient();
    const url = new URL(request.url);

    const slug = url.searchParams.get("slug");

    if (!slug) {
      applyResponseContextToSentry(400);
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
      applyResponseContextToSentry(404);
      return NextResponse.json({ error: "URL not found." }, { status: 404 });
    }

    const link = data[0];

    const cookieStore = await cookies();
    const VIEWER_COOKIE = "jc_viewer_token";
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
      applyResponseContextToSentry(429);
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
        response.cookies.set(VIEWER_COOKIE, viewerToken, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }

      return response;
    }

    applyResponseContextToSentry(200);
    const response = NextResponse.json({
      status: 200,
      id: link.id,
      url: link.url,
    });

    if (!cookieStore.get(VIEWER_COOKIE)?.value && viewerToken) {
      response.cookies.set(VIEWER_COOKIE, viewerToken, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  },
  {
    method: "GET",
    parameterizedRoute: "/api/shorten-url",
  },
);

export const POST = wrapRouteHandlerWithSentry(
  withAuthRoute(async function POST({ request, supabase, user }) {
    applyRequestContextToSentry({ request });
    const limitResponse = await enforceRateLimit(publicLimiter, request, {
      tags: ["shorten-url:create"],
    });
    if (limitResponse) return limitResponse;

    try {
      const validated = validateContentType(request);
      if (validated instanceof NextResponse) {
        applyResponseContextToSentry(415);
        return validated;
      }

      const { url, snippet_id, title, description } = await request.json();

      applyRequestContextToSentry({ request });

      const longUrl = url ? url : null;
      const isInternalPayload = typeof longUrl === "string" && longUrl.startsWith("animation:");
      const validURL = isInternalPayload || await isValidURL(longUrl);

      if (!validURL) {
        applyResponseContextToSentry(400);
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
        applyResponseContextToSentry(500);
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

        applyResponseContextToSentry(200);
        return NextResponse.json({
          status: 200,
          short_url: existing.short_url,
        });
      }

      if (existing) {
        applyResponseContextToSentry(200);
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
          applyResponseContextToSentry(200);
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
          applyResponseContextToSentry(500);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // If it's the last attempt, return error
        if (attempt === maxRetries - 1) {
          console.error("Failed to generate unique short URL after retries:", insertError);
          applyResponseContextToSentry(500);
          return NextResponse.json(
            { error: "Failed to generate unique short URL. Please try again." },
            { status: 500 }
          );
        }

        // Otherwise, retry with a new key
      }

      // This should never be reached, but TypeScript requires it
      applyResponseContextToSentry(500);
      return NextResponse.json(
        { error: "Failed to generate short URL" },
        { status: 500 }
      );
    } catch (error: any) {
      console.error("Shorten URL Error:", error);
      applyResponseContextToSentry(500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }),
  {
    method: "POST",
    parameterizedRoute: "/api/shorten-url",
  },
);
