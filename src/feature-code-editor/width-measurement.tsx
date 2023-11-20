import React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type WidthMeasurementProps = {
  isVisible: boolean;
  width: string;
};

function Divider({ reverse }: { reverse?: boolean }) {
  return (
    <div className={cn("flex-1 flex items-center", reverse ? "flex-row-reverse" : "")}>
      <div className="h-4 w-0.5 bg-foreground/60" />
      <div className="h-px w-full bg-foreground/60" />
    </div>
  );
}

export const WidthMeasurement = React.memo(function WidthMeasurement({
  isVisible,
  width,
}: WidthMeasurementProps) {
  return (
    <div
      className={cn(
        "mt-1 w-full gap-2 items-center text-foreground transition-opacity",
        isVisible ? "flex opacity-100" : "hidden opacity-0"
      )}
    >
      <Divider />
      <Badge variant="secondary">{width}px</Badge>
      <Divider reverse />
    </div>
  );
});
