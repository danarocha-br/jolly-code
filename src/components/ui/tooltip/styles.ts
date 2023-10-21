import { cva } from "class-variance-authority";

export const content = cva([
  "z-50",
  "overflow-hidden",
  "rounded-md",
  "bg-subdued",
  "border",
  "border-border",
  "dark:border-border/40",
  "px-3",
  "py-1.5",
  "text-[11px]",
  "text-muted-foreground",
  "animate-in",
  "fade-in-0",
  "zoom-in-95",
  "z-[999]",

  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=closed]:zoom-out-95",

  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2",
  "data-[side=top]:slide-in-from-bottom-2",
]);
