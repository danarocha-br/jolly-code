"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { FriendlyError } from "@/components/errors/friendly-error";

export default function RootError({
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
      title="We couldn’t load this page"
      description="An unexpected issue blocked the page from rendering. Try again or return home."
      reset={reset}
    />
  );
}
