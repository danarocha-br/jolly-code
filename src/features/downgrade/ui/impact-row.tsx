import { formatLimit } from "../utils";

type ImpactRowProps = {
  label: string;
  current: number;
  max: number | null;
  overLimit: number;
  willBeOverLimit: boolean;
};

export function ImpactRow({
  label,
  current,
  max,
  overLimit,
  willBeOverLimit,
}: ImpactRowProps) {
  if (!willBeOverLimit) {
    return null;
  }

  return (
    <div className="mt-3 relative flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-px">
      <span className="text-xs font-medium text-destructive bg-muted border border-destructive/50 rounded-r-full px-2 py-px absolute top-0 -left-px -translate-y-1/2">
        {label}
      </span>
      <div className="w-full flex items-center justify-between gap-2 pt-3">
        <p className="text-sm font-semibold text-destructive mr-auto w-full">
          {current}{" "}
          <span className="text-foreground">/ {formatLimit(max)}</span>
        </p>
        <p className="text-xs text-destructive/80 whitespace-nowrap">
          {overLimit} over limit
        </p>
      </div>
    </div>
  );
}
