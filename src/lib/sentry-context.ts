import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";

type ContextOptions = {
  request: NextRequest;
  userId?: string | null;
  locale?: string | null;
  featureFlags?: string[] | null;
};

export function applyRequestContextToSentry({
  request,
  userId,
  locale,
  featureFlags,
}: ContextOptions) {
  const url = new URL(request.url);

  Sentry.setTag("request.method", request.method);
  Sentry.setTag("request.path", url.pathname);

  const resolvedLocale =
    locale ?? request.headers.get("accept-language")?.split(",")[0];
  if (resolvedLocale) {
    Sentry.setTag("locale", resolvedLocale);
  }

  if (userId) {
    Sentry.setUser({ id: userId });
  }

  const resolvedFeatureFlags =
    featureFlags ?? parseFeatureFlagHeader(request.headers.get("x-feature-flags"));
  if (resolvedFeatureFlags.length > 0) {
    Sentry.setContext("feature_flags", { flags: resolvedFeatureFlags });
  }
}

export function applyResponseContextToSentry(status: number) {
  Sentry.setTag("response.status_code", status.toString());
}

function parseFeatureFlagHeader(headerValue: string | null) {
  if (!headerValue) {
    return [] as string[];
  }

  return headerValue
    .split(",")
    .map((flag) => flag.trim())
    .filter(Boolean);
}
