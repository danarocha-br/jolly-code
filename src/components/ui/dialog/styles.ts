import { cva } from "class-variance-authority";

export const overlay = cva([
  "fixed",
  "inset-0",
  "z-[999]",
  "bg-subdued/70",
  "dark:bg-background/70",
  "backdrop-blur-md",

  "data-[state=open]:animate-in",
  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=open]:fade-in-0",
]);

export const content = cva([
  "bg-white",
  "text-foreground",
  "dark:bg-background",
  "border",
  "border-border/60",
  "py-4",
  "fixed",
  "left-[50%]",
  "top-[50%]",
  "z-[999]",
  "grid",
  "w-full",
  "max-w-lg",
  "translate-x-[-50%]",
  "translate-y-[-50%]",
  "gap-4",
  "shadow-lg",
  "duration-200",

  "data-[state=open]:animate-in",
  "data-[state=open]:fade-in-0",
  "data-[state=open]:zoom-in-95",

  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=closed]:zoom-out-95",

  "sm:rounded-lg md:w-full",
]);

export const close = cva([
  "absolute",
  "right-4",
  "top-4",
  "rounded-sm",
  "opacity-70",
  "ring-offset-background",
  "transition-opacity",

  "hover:opacity-100",

  "focus:outline-none",
  "focus:ring-2",
  "focus:ring-ring",
  "focus:ring-offset-2",

  "disabled:pointer-events-none",

  "data-[state=open]:bg-accent",
  "data-[state=open]:text-muted-foreground",
]);

export const header = cva([
  "flex",
  "flex-col",
  "text-center",
  "sm:text-left",
  "border-b",
  "px-4",
  "pb-4",
  "font-light",
  "tracking-wide",
]);

export const footer = cva([
  "flex",
  "flex-col-reverse",
  "sm:flex-row",
  "sm:justify-end",
  "sm:space-x-2",
  "px-4",
  "pt-4",
  "border-t",
]);

export const title = cva([
  "leading-none",
  "tracking-tight",
]);
