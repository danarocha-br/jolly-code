import { cva } from "class-variance-authority";

export const container = cva(
  ["relative",
    "bg-card",
    "flex-shrink-0",
    "w-48",
    "h-32",
    "rounded-xl",
    "border-2",
    "transition-all",
    "focus-visible:outline-none",
    "focus-visible:border-2",
    "focus-visible:border-brand/40",
    "dark:focus-visible:border-primary",
  ],
  {
    variants: {
      active: {
        true: "border-brand/40 dark:border-primary",
        false: "border-border hover:border-brand/40 dark:hover:border-primary/50",
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
export const header = cva("flex items-center justify-between mt-1 mb-1.5");
export const slideLabel = cva("text-xs font-medium text-card-foreground truncate");
export const removeButton = cva("absolute top-1 right-1 h-6 w-6 text-foreground/40 hover:text-destructive transition-colors");

export const preview = cva("flex-1 rounded p-1.5 overflow-hidden relative");
export const previewOverlay = cva("absolute inset-0 dark:bg-black/25");
export const previewCode = cva(
  "bg-background/95 dark:bg-black/70 rounded-sm p-2 relative z-10 text-[7px] leading-tight overflow-hidden whitespace-pre-wrap break-words text:foreground drop-shadow-sm h-13.5"
);

export const meta = cva("mt-2 flex items-center justify-between text-[11px] text-muted-foreground gap-2");
export const title = cva("truncate max-w-[70%] font-medium text-foreground/70");
export const duration = cva("whitespace-nowrap");
