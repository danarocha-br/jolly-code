import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

import { isValidURL } from "@/lib/utils/is-valid-url";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getDomain } from "@/lib/utils/get-domain";

export const runtime = "edge";

// export async function GET(request) {
//     const links = await getMinLinksAndVisits(100, 0)
//     return NextResponse.json(links, {status: 200})
// }

const shortURLs: { [key: string]: string } = {};
const keySet: Set<string> = new Set();

// export async function GET(request: NextRequest, response: NextResponse) {
//   const longUrl = shortURLs[response.params.id];

//   if (!longUrl) throw new Error("the short url is wrong");
//   request.redirect(longUrl);

// }

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const contentType = await request.headers.get("content-type");
    if (contentType !== "application/json") {
      return NextResponse.json({ error: "Invalid request" }, { status: 415 });
    }

    const { url, snippet_id, user_id } = await request.json();

    const longUrl = url ? url : null;
    const validURL = await isValidURL(longUrl, []);

    if (!validURL) {
      return NextResponse.json(
        { message: `${longUrl} is not a valid url.` },
        { status: 400 }
      );
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

    const shortUrl = `${getDomain()}/${key}`;

    const data = await supabase
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

    return NextResponse.json({
      status: 200,
      data,
    });
  } catch (error) {
    return NextResponse.json(error, { status: 500 });
  }
}
