import { cva } from "class-variance-authority";

export const root = cva([
  "relative",
  "w-16",
  "lg:w-20",
  "touch-none",
  "select-none",
  "flex",
  "items-center",
  "justify-center",
  "group",
]);

export const track = cva([
  "relative",
  "bg-muted/20",
  "capitalize",
  "truncate",
  "text-xs",
  "dark:text-accent-foreground/70",
  "border-[1.7px]",
  "border-border",
  "h-full",
  "overflow-hidden",
  "w-full",
  "grow",
  "rounded-xl",

  "hover:cursor-move",
  "group-hover:bg-muted/60",
]);

export const range = cva([
  "group",
  "bg-success/20",
  "w-full",
  "absolute",
  "transition-colors",

  "hover:bg-success/30",
]);

export const thumb = cva([
  "hidden",
  "bg-[#6F948F]",
  "bg-[#6F948F]/20",
  "border",
  "border-background",
  "rounded-sm",
  "relative",
  "top-[1px]",
  "h-2",
  "w-5",
  "rounded-xs",
  "shadow-2xl",
  "transition-colors",

  "focus-visible:bg-[#6F948F]",
  "focus-visible:outline-none",
  "focus-visible:ring-1",
  "focus-visible:ring-muted",
  "disabled:pointer-events-none",
  "disabled:opacity-50",
]);

export const label = cva([
  "dark:text-accent-foreground/70",
  "text-xs",
  "text-center",
  "truncate",
  "w-full",
  "absolute",
  "top-2",
  "z-10 ",
]);

export const icon = cva([
  "mix-blend-luminosity",
  "dark:mix-blend-difference",
  "absolute",
  "bottom-3",
  "text-xl",
  "z-10",
]);
