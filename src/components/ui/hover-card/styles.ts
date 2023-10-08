import { cva } from "class-variance-authority";

export const content = cva([
  "text-popover-foreground",
  "bg-popover",
  "border",
  "rounded-md",
  "shadow-md",
  "z-50",
  "p-2",
  "outline-none",

  "data-[state=open]:animate-in",
  "data-[state=open]:fade-in-0",
  "data-[state=open]:zoom-in-95",

  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=closed]:zoom-out-0",

  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2",
  "data-[side=top]:slide-in-from-bottom-2",
]);
