import { cva } from "class-variance-authority";

export const input = cva([
  "flex",
  "h-9",
  "w-full",
  "rounded-md",
  "border",
  "border-input",
  "bg-muted/50",
  "px-3",
  "py-1",
  "text-sm",
  "shadow-sm",
  "transition-colors",

  "file:border-0",
  "file:bg-transparent",
  "file:text-sm",
  "file:font-medium",

  "placeholder:text-muted-foreground",

  "focus-visible:outline-none",
  "focus-visible:outline-2",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-muted/20",

  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
]);
