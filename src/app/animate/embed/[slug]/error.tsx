"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { FriendlyError } from "@/components/errors/friendly-error";

export default function EmbeddedAnimationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <FriendlyError
      title="This embedded animation failed to load"
      description="We hit an issue while rendering the embed. Retry or open the full animation instead."
      reset={reset}
      actionLabel="Retry"
    />
  );
}
