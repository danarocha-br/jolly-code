"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { FriendlyError } from "@/components/errors/friendly-error";

export default function AnimateError({
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
      title="Animation studio is having a moment"
      description="We couldn’t load the animation editor right now. Please retry, and we’ll get you back to creating."
      reset={reset}
    />
  );
}
