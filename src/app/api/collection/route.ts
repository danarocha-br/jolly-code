import { getUserCollectionById } from "@/lib/services/database";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    let currentUser;
    try {
      currentUser = await supabase.auth.getUser();
    } catch (error) {
      console.error("Error getting user:", error);
      return NextResponse.json(
        {
          error:
            "An error occurred while getting user. Please try again later.",
        },
        { status: 500 }
      );
    }
    const user_id = currentUser.data.user?.id;

    if (!user_id) {
      return NextResponse.json(
        { error: "User must be authenticated." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);

    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "No collection id was provided." },
        { status: 400 }
      );
    }

    const data = await getUserCollectionById({
      id,
      user_id,
      supabase,
    });

    if (!data) {
      return NextResponse.json(
        { error: "Collection not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 200,
      data,
    });
  } catch (error: Error | any) {
    error = error.message;
  }
}
