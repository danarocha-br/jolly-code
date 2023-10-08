import { cva } from "class-variance-authority";

export const itemContainer = cva([
  "text-xs",
  "dark:text-accent-foreground/70",
  "capitalize",
  "truncate",
  "bg-muted/30",
  "dark:bg-muted/20",
  "px-2",
  "py-2",
  "border-[1.7px]",
  "border-border",
  "mix-blend-luminosity",
  "rounded-[13px]",
  "h-28",
  "w-16",
  "lg:w-20",
  "flex",
  "flex-col",
  "items-center",
  "justify-between",
  "transition-colors",
  "overflow-hidden",

  "hover:bg-muted/60",
  "dark:hover:bg-muted/40",
]);

export const footer = cva([
  "bg-background/80",
  "rounded-2xl",
  "backdrop-blur-3xl ",

  "flex",
  "gap-1",
  "lg:gap-2",
  "justify-center",
  "w-full",
  "lg:w-auto",

  "fixed",
  "bottom-1",
  "md:bottom-10",
  "2xl:bottom-16",
  "p-3",
]);

export const footerShared = cva([
  "bg-white/20",
  "rounded-2xl",
  "backdrop-blur-3xl ",

  "flex",
  "gap-1",
  "lg:gap-2",
  "justify-center",
  "w-full",
  "lg:w-auto",

  "fixed",
  "bottom-1",
  "md:bottom-10",
  "2xl:bottom-16",
  "p-3",
]);
