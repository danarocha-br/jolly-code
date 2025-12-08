"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { FriendlyError } from "@/components/errors/friendly-error";

export default function SharedLinkError({
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
      title="We couldn’t open this shared link"
      description="The shared snippet hit an unexpected error. Try again or head back to the dashboard."
      reset={reset}
      actionLabel="Reload link"
    />
  );
}
