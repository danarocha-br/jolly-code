import { cva } from "class-variance-authority";

export const container = cva(
  "relative flex-shrink-0 w-48 h-32 rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      active: {
        true: "border-primary bg-primary/10",
        false: "border-border bg-card hover:border-primary/50",
      },
      dragging: {
        true: "opacity-50 scale-95",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
      dragging: false,
    },
  }
);

export const body = cva("relative py-1 px-2 flex flex-col h-full");
export const header = cva("flex items-center justify-between my-1");
export const slideLabel = cva("text-xs font-medium text-card-foreground truncate");
export const removeButton = cva("absolute top-1 right-1 h-6 w-6");

export const preview = cva("flex-1 rounded p-2 overflow-hidden relative border border-border/60");
export const previewOverlay = cva("absolute inset-0 bg-black/25");
export const previewCode = cva(
  "bg-black/70 rounded-sm p-2 relative z-10 text-[7px] leading-tight overflow-hidden whitespace-pre-wrap break-words text-white drop-shadow-sm h-13"
);

export const meta = cva("mt-2 flex items-center justify-end text-xs text-muted-foreground");
export const duration = cva("");
