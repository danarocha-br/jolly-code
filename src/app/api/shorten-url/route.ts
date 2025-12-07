import {
  applyRequestContextToSentry,
  applyResponseContextToSentry,
} from "@/lib/sentry-context";
import { isValidURL } from "@/lib/utils/is-valid-url";
import { validateContentType } from "@/lib/utils/validate-content-type-request";
import { createClient } from "@/utils/supabase/server";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const runtime = "edge";

const keySet: Set<string> = new Set();

/**
 * Retrieves the URL associated with a given slug.
 *
 * @param {NextRequest} request - an url
 * @return {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the URL associated with the slug, or an error response if the slug is invalid or not found.
 */
export const GET = wrapRouteHandlerWithSentry(
  async function GET(request: NextRequest) {
    applyRequestContextToSentry({ request });
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

    let viewResult:
      | { allowed?: boolean; counted?: boolean; current?: number; max?: number | null; plan?: string }
      | null = null;

    try {
      const { data: recordViewData, error: recordViewError } = await supabase.rpc(
        "record_public_share_view" as never,
        { p_owner_id: link.user_id, p_link_id: link.id, p_viewer_token: viewerToken }
      );

      if (recordViewError) {
        throw recordViewError;
      }

      viewResult = recordViewData as typeof viewResult;
    } catch (recordError) {
      console.error("Failed to record share view", recordError);
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
  async function POST(request: NextRequest) {
    applyRequestContextToSentry({ request });
    const supabase = await createClient();
    try {
      const contentType = await request.headers.get("content-type");
      if (contentType !== "application/json") {
        applyResponseContextToSentry(415);
        return NextResponse.json({ error: "Invalid request" }, { status: 415 });
      }

      const { url, snippet_id, title, description } =
        await validateContentType(request).json();

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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        applyResponseContextToSentry(401);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

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

      const key = nanoid(5);
      if (keySet.has(key)) {
        applyResponseContextToSentry(400);
        return NextResponse.json(
          { error: "Key is duplicated." },
          { status: 400 }
        );
      }

      keySet.add(key);

      const shortUrl = key;

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

      if (insertError) {
        console.error("Insert Error:", insertError);
        applyResponseContextToSentry(500);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      applyResponseContextToSentry(200);
      return NextResponse.json({
        status: 200,
        short_url: shortUrl,
      });
    } catch (error: any) {
      console.error("Shorten URL Error:", error);
      applyResponseContextToSentry(500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  },
  {
    method: "POST",
    parameterizedRoute: "/api/shorten-url",
  },
);
