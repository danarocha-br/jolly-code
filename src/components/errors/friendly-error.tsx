"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  reset?: () => void;
  actionLabel?: string;
  className?: string;
};

export function FriendlyError({
  title = "Something went wrong",
  description = "We hit a snag. Try again or head back home while we sort this out.",
  reset,
  actionLabel = "Try again",
  className,
}: Props) {
  return (
    <div className={cn("min-h-[320px] w-full flex items-center justify-center p-6", className)}>
      <Card className="w-full max-w-xl border-border/60 bg-card/70 backdrop-blur">
        <div className="flex flex-col gap-3 p-6">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              !
            </span>
            <span>Unexpected error</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            {reset ? (
              <Button onClick={reset}>{actionLabel}</Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
