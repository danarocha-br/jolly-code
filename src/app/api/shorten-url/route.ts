import {
  applyRequestContextToSentry,
  applyResponseContextToSentry,
} from "@/lib/sentry-context";
import { isValidURL } from "@/lib/utils/is-valid-url";
import { validateContentType } from "@/lib/utils/validate-content-type-request";
import { Database } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const runtime = "edge";



const shortURLs: { [key: string]: string } = {};
const keySet: Set<string> = new Set();

/**
 * Retrieves the URL associated with a given slug.
 *
 * @param {NextRequest} request - an url
 * @return {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the URL associated with the slug, or an error response if the slug is invalid or not found.
 */
export const GET = wrapRouteHandlerWithSentry(async function GET(
  request: NextRequest,
) {
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

  if (!isValidURL(slug)) {
    applyResponseContextToSentry(400);
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  let data;
  let error;
  try {
    const result = await supabase
      .from("links")
      .select("id, url")
      .eq("short_url", slug);

    data = result.data;

    error = result.error;
  } catch (error: Error | any) {
    error = error.message;
  }

  if (!data) {
    applyResponseContextToSentry(404);
    return NextResponse.json({ error: "URL not found." }, { status: 404 });
  }

  applyResponseContextToSentry(200);
  return NextResponse.json({
    status: 200,
    id: data[0].id,
    url: data[0].url,
  });
});

export const POST = wrapRouteHandlerWithSentry(async function POST(
  request: NextRequest,
) {
  applyRequestContextToSentry({ request });
  const supabase = await createClient();
  try {
    const contentType = await request.headers.get("content-type");
    if (contentType !== "application/json") {
      applyResponseContextToSentry(415);
      return NextResponse.json({ error: "Invalid request" }, { status: 415 });
    }

    const { url, snippet_id, user_id } =
      await validateContentType(request).json();

    applyRequestContextToSentry({ request, userId: user_id });

    const longUrl = url ? url : null;
    const validURL = await isValidURL(longUrl);

    let data;

    if (!validURL) {
      applyResponseContextToSentry(400);
      return NextResponse.json(
        { message: `${longUrl} is not a valid url.` },
        { status: 400 }
      );
    }

    const { data: existingUrl, error } = await supabase
      .from("links")
      .select("url, short_url")
      .eq("url", longUrl);

    if (error) {
      console.error(error);
      applyResponseContextToSentry(500);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (existingUrl && existingUrl.length > 0) {
      // URL already exists, return the existing short URL
      applyResponseContextToSentry(200);
      return NextResponse.json({
        status: 200,
        short_url: existingUrl[0].short_url,
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
    shortURLs[key] = longUrl;

    const shortUrl = key;

    const { error: insertError } = await supabase
      .from("links")
      .insert([
        {
          user_id: user_id ? user_id : null,
          url: longUrl,
          short_url: shortUrl,
          snippet_id: snippet_id ? snippet_id : null,
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
});
