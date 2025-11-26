import { applyRequestContextToSentry, applyResponseContextToSentry } from "@/lib/sentry-context";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { validateContentType } from "@/lib/utils/validate-content-type-request";

const supabase: SupabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Handles the POST request and updates the visit count for a link in the database.
 *
 * @param {NextRequest} request - The incoming request object.
 * @return {Promise<NextResponse>} - A promise that resolves to the response object.
 */
export const POST = wrapRouteHandlerWithSentry(async function POST(
  request: NextRequest,
) {
  applyRequestContextToSentry({ request });

  try {
    const { id } = await await validateContentType(request).json();

    if (!id) {
      applyResponseContextToSentry(400);
      return NextResponse.json(
        { message: "No link found in the database." },
        { status: 400 }
      );
    }

    const getVisitsResult = await supabase
      .from("links")
      .select("visits")
      .eq("id", id);

    if (
      getVisitsResult.error ||
      !getVisitsResult.data ||
      !getVisitsResult.data[0]
    ) {
      console.error(getVisitsResult.error);
      applyResponseContextToSentry(500);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let currentVisits = getVisitsResult.data[0].visits;

    if (currentVisits === null) {
      currentVisits = 0;
    }

    const updatedVisitCount = currentVisits + 1;

    let data;

    const result = await supabase
      .from("links")
      .update({ visits: updatedVisitCount })
      .eq("id", id)
      .select("visits");

    if (result.error) {
      console.error(result.error);
      applyResponseContextToSentry(500);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    data = result.data;

    applyResponseContextToSentry(200);

    return NextResponse.json({
      status: 200,
      visits: data[0].visits,
    });
  } catch (error) {
    applyResponseContextToSentry(500);
    return NextResponse.json(error, { status: 500 });
  }
});
