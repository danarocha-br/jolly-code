"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { FriendlyError } from "@/components/errors/friendly-error";

export default function SharedAnimationError({
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
  }, [error]);

  return (
    <FriendlyError
      title="We couldn’t load this shared animation"
      description="An error occurred while opening the shared animation. Please try again or return to animations."
      reset={reset}
      actionLabel="Reload"
    />
  );
}
