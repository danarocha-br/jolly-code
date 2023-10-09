import { cva } from "class-variance-authority";

export const container = cva([
  "flex",
  "justify-between",
  "items-center",
  "w-full",
  "gap-3"
]);

export const label = cva([
  "text-sm",
  "text-foreground/60",
]);
