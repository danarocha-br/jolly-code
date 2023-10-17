import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

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
export async function POST(request: NextRequest) {
  try {
    const contentType = await request.headers.get("content-type");
    if (contentType !== "application/json") {
      return NextResponse.json({ error: "Invalid request" }, { status: 415 });
    }

    const { id } = await request.json();

    if (!id) {
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
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    data = result.data;

    return NextResponse.json({
      status: 200,
      visits: data[0].visits,
    });
  } catch (error) {
    return NextResponse.json(error, { status: 500 });
  }
}
