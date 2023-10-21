import { cva } from "class-variance-authority";

export const trigger = cva([
  "flex",
  "flex-1",
  "items-center",
  "justify-between",
  "py-2",
  "px-2",
  "text-sm",
  "font-medium",
  "rounded-md",
  "transition-all",
  "hover:bg-muted/50",
  "dark:hover:bg-muted/20",
  "[&[data-state=open]>svg]:rotate-90",
]);

export const content = cva([
  "mt-2",
  "ml-7",
  "overflow-hidden",
  "text-sm",
  "data-[state=closed]:animate-accordion-up",
  "data-[state=open]:animate-accordion-down",
]);

export const icon = cva([
  "h-4",
  "w-4",
  "mr-2",
  "shrink-0",
  "text-muted-foreground",
  "transition-transform",
  "duration-200",
]);
