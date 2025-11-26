import { applyRequestContextToSentry, applyResponseContextToSentry } from "@/lib/sentry-context";
import { wrapRouteHandlerWithSentry } from "@sentry/nextjs";
import { NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

export const POST = wrapRouteHandlerWithSentry(async function POST(
  req: NextRequest | Request,
) {
  if (req instanceof NextRequest) {
    applyRequestContextToSentry({ request: req });
  }

  try {
    const response = await fetch("https://canny.io/api/v1/entries/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: process.env.NEXT_PUBLIC_CANNY_API_KEY,
      }),
    });
    const result = await response.json();

    applyResponseContextToSentry(200);

    return NextResponse.json({
      status: 200,
      result,
    });
  } catch (error) {
    applyResponseContextToSentry(500);
    return NextResponse.json(
      { error: "An error occurred during the fetch operation." },
      { status: 500 }
    );
  }
});
