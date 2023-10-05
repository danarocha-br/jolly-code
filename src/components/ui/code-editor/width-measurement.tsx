import { cn } from "@/lib/utils";
import { Badge } from "../badge";

type WidthMeasurementProps = {
  showWidth: boolean;
  width: string;
};

export default function WidthMeasurement({
  showWidth,
  width,
}: WidthMeasurementProps) {
  return (
    <div
      className={cn(
        "mt-1 w-full flex gap-2 items-center text-foreground transition-opacity",
        showWidth ? "visible opacity-100" : "invisible opacity-0"
      )}
    >
      <div className="flex-1 flex items-center">
        <div className="h-4 w-0.5 bg-foreground/60" />
        <div className="h-px w-full bg-foreground/60" />
      </div>
      <Badge variant="secondary">{width}px</Badge>
      <div className="flex-1 flex items-center">
        <div className="h-px w-full bg-foreground/60" />
        <div className="h-4 w-0.5 bg-foreground/60" />
      </div>
    </div>
  );
}
