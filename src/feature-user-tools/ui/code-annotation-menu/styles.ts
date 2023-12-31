import { cva } from "class-variance-authority";

export const content = cva([
  "flex",
  "flex-col",
  "gap-2",
  "p-4",
  "w-[280px]",
  "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]",
  "from-green-50",
  "via-zinc-100",
  "to-accent",

  "dark:from-green-900",
  "dark:via-zinc-900",
  "dark:to-zinc-900",
]);

export const text = cva([
  "text-sm",
  "text-foreground/70"
])

export const title = cva([
  "mt-2",
  "mb-3",
  "text-foreground"
])

export const ctaLink = cva([
  "text-sm",
  "py-2",
  "w-full",
  "rounded-md",
  "text-center",
  "transition-colors",
  "border",
  "border-success",
  "mt-4",

  "hover:bg-success/10",
]);
