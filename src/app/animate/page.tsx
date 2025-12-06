import { headers } from "next/headers";

import { AnimationAccessDenied } from "@/features/animation/components/access-denied";
import { FEATURE_FLAG_KEYS } from "@/lib/services/tracking/feature-flag-keys";
import { getAnimationFeatureFlag } from "@/lib/services/tracking/feature-flags";
import { captureServerEvent } from "@/lib/services/tracking/server";
import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code Animation Editor | Jolly Code",
  description: "Create engaging code animations for social media. Turn static code snippets into beautiful videos.",
  alternates: {
    canonical: "/animate",
  },
};

export default async function AnimatePage() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const AnimationExperience = (await import("./animation-client")).default;
    return <AnimationExperience />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;
  const email = user?.email?.toLowerCase();

  const flag = await getAnimationFeatureFlag({
    distinctId: user?.id ?? email,
    personProperties: email ? { email } : undefined,
  });

  if (!flag.isEnabled) {
    const requestHeaders = await headers();
    const readHeader = (key: string) => requestHeaders.get(key) ?? undefined;
    const deniedPath = readHeader("next-url") || "/animate";
    const referer = readHeader("referer") || undefined;

    void captureServerEvent("feature_access_denied", {
      distinctId: user?.id ?? email ?? undefined,
      properties: {
        feature_flag: FEATURE_FLAG_KEYS.betaCodeAnimate,
        path: deniedPath,
        referer,
        flag_reason: flag.reason,
      },
    });

    return <AnimationAccessDenied />;
  }

  const AnimationExperience = (await import("./animation-client")).default;
  return <AnimationExperience />;
}
