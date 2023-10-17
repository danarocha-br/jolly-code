import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const contentType = await request.headers.get("content-type");
    if (contentType !== "application/json") {
      return NextResponse.json({ error: "Invalid request" }, { status: 415 });
    }

    const { id, numberOfVisits } = await request.json();

    if (!id) {
      return NextResponse.json(
        { message: "No link found in the database." },
        { status: 400 }
      );
    }

    let data;

    const result = await supabase
      .from("links")
      .update({ visits: numberOfVisits })
      .match({ id });

    if (result.error) {
      console.error(result.error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    data = result.data;

    if (!data || !data[0]) {
      return NextResponse.json({ error: "No data found." }, { status: 404 });
    }

    return NextResponse.json({
      status: 200,
      visits: data,
    });
  } catch (error) {
    return NextResponse.json(error, { status: 500 });
  }
}
