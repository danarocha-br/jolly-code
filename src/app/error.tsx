"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { analytics } from "@/lib/services/tracking";
import { ERROR_EVENTS } from "@/lib/services/tracking/events";

import { FriendlyError } from "@/components/errors/friendly-error";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only report to Sentry in production/non-local environments
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    }
    // Track error in analytics
    analytics.trackError(ERROR_EVENTS.CLIENT_ERROR_OCCURRED, error, {
      page: "root",
      digest: error.digest,
    });
  }, [error]);

  return (
    <FriendlyError
      title="We couldn’t load this page"
      description="An unexpected issue blocked the page from rendering. Try again or return home."
      reset={reset}
    />
  );
}
