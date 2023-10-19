import { NextRequest, NextResponse } from "next/server";

// Middleware for content type validation
export function validateContentType(request: NextRequest) {
  const contentType = request.headers.get("content-type");
  if (contentType !== "application/json") {
    return NextResponse.json({ error: "Invalid request" }, { status: 415 });
  }
  return request;
}
