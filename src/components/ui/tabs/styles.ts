import { cva } from "class-variance-authority";

export const list = cva([
  "inline-flex",
  "items-center",
  "justify-center",
  "rounded-lg",
  "p-1",
  "text-foreground/30",
]);

export const trigger = cva([
  "inline-flex",
  "items-center",
  "justify-center",
  "whitespace-nowrap",
  "rounded-md",
  "px-3",
  "py-1",
  "text-sm",
  "font-medium",

  "transition-all",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "disabled:pointer-events-none",
  "disabled:opacity-50",

  "data-[state=active]:bg-foreground/[0.05]",
  "dark:data-[state=active]:bg-foreground/[0.03]",
  "data-[state=active]:text-foreground",
  "hover:data-[state=active]:bg-foreground/5",
]);

export const content = cva([
  "focus-visible:outline-none",
]);
