import { cva } from "class-variance-authority";

export const input = cva([
  "flex",
  "h-9",
  "w-full",
  "rounded-full",
  "border-2",
  "border-input",
  "bg-muted",
  "group-hover/field:bg-muted/80",
  "group-hover/field:border-brand/30",
  "dark:group-hover/field:border-primary",
  "transition-all",

  "px-3",
  "py-1",
  "text-sm",

  "file:border-0",
  "file:bg-transparent",
  "file:text-sm",
  "file:font-medium",

  "placeholder:text-muted-foreground/60",
  "outline-none",
  "focus-visible:border-2",
  "focus-visible:border-brand/30",
  "dark:focus-visible:border-primary",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
]);
