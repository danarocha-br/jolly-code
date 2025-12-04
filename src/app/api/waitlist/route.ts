import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { FEATURE_FLAG_KEYS } from "@/lib/services/tracking/feature-flag-keys";

const allowedFeatures = new Set<string>(Object.values(FEATURE_FLAG_KEYS));

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;

  let payload: {
    email?: string;
    feature_key?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const featureKey = payload.feature_key;
  const metadata = payload.metadata ?? {};
  const referer = request.headers.get("referer") || null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (!featureKey || !allowedFeatures.has(featureKey)) {
    return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
  }

  const { error } = await supabase.from("waitlist").insert({
    email,
    feature_key: featureKey,
    user_id: user?.id ?? null,
    referer,
    metadata,
  });

  if (error) {
    const isConflict = error.message?.toLowerCase().includes("duplicate") ?? false;
    return NextResponse.json(
      { error: isConflict ? "You are already on the list." : "Unable to join the waitlist." },
      { status: isConflict ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
