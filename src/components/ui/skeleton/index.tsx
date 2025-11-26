import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted/50 h-4 w-full",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton }
