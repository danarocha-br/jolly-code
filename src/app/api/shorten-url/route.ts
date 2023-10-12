import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import Error from "next/error";

import { isValidURL } from "@/lib/utils/is-valid-url";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "edge";

const shortURLs: { [key: string]: string } = {};
const keySet: Set<string> = new Set();

/**
 * Retrieves the URL associated with a given slug.
 *
 * @param {NextRequest} request - an url
 * @return {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the URL associated with the slug, or an error response if the slug is invalid or not found.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const slug = url.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "No slug was provided." },
      { status: 400 }
    );
  }

  if (!isValidURL(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  let data;
  let error;
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const result = await supabase
      .from("links")
      .select("url")
      .eq("short_url", slug);

    data = result.data;

    error = result.error;
  } catch (error: Error | any) {
    error = error.message;
  }

  if (!data) {
    return NextResponse.json({ error: "URL not found." }, { status: 404 });
  }

  return NextResponse.json({
    status: 200,
    url: data[0].url,
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const contentType = await request.headers.get("content-type");
    if (contentType !== "application/json") {
      return NextResponse.json({ error: "Invalid request" }, { status: 415 });
    }

    const { url, snippet_id, user_id } = await request.json();

    const longUrl = url ? url : null;
    const validURL = await isValidURL(longUrl);

    let data;

    if (!validURL) {
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
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (existingUrl && existingUrl.length > 0) {
      // URL already exists, return the existing short URL
      return NextResponse.json({
        status: 200,
        short_url: existingUrl[0].short_url,
      });
    }

    const key = nanoid(5);
    if (keySet.has(key)) {
      return NextResponse.json(
        { error: "Key is duplicated." },
        { status: 400 }
      );
    }

    keySet.add(key);
    shortURLs[key] = longUrl;

    const shortUrl = key;

    const result = await supabase
      .from("links")
      .insert([
        {
          user_id: user_id ? user_id : null,
          url: longUrl,
          short_url: shortUrl,
          snippet_id: snippet_id ? snippet_id : null,
        },
      ])
      .select();

    data = result.data;

    if (!data || !data[0]) {
      return NextResponse.json({ error: "No data found." }, { status: 404 });
    }

    return NextResponse.json({
      status: 200,
      short_url: data[0].short_url,
    });
  } catch (error) {
    return NextResponse.json(error, { status: 500 });
  }
}
