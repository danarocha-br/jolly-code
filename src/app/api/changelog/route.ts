import { NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest | Request, res: NextApiResponse) {
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

    return NextResponse.json({
      status: 200,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred during the fetch operation." },
      { status: 500 }
    );
  }
}
