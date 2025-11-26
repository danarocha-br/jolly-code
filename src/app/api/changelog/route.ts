import { NextRequest, NextResponse } from "next/server";

const CANNY_ENTRIES_URL = "https://canny.io/api/v1/entries/list";

export async function POST(req: NextRequest | Request) {
  try {
    const apiKey = process.env.CANNY_API_KEY;

    if (!apiKey) {
      console.error("CANNY_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "Canny API key is not configured." },
        { status: 500 }
      );
    }

    const upstream = await fetch(CANNY_ENTRIES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error(`Canny API error: ${upstream.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Canny responded with ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const result = await upstream.json();

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Changelog API error:", error);
    return NextResponse.json(
      { error: "An error occurred during the fetch operation." },
      { status: 500 }
    );
  }
}
