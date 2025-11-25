import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    console.log('Exchanging code for session...');
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('OAuth callback error:', error.message);
      // Redirect to home with error parameter
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }
    
    console.log('Session established successfully:', !!data.session);
  }

  // URL to redirect to after sign in process completes
  const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } else if (forwardedHost) {
    return NextResponse.redirect(new URL(next, `https://${forwardedHost}`));
  } else {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }
}
