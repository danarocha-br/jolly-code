import { cva } from "class-variance-authority";

export const image = cva(["aspect-square", "h-full", "w-full"]);

export const fallback = cva([
  "text-xs",
  "bg-accent",
  "rounded-full",
  "flex",
  "h-full",
  "w-full",
  "items-center",
  "justify-center",
]);

export const avatar = cva([
  "relative",
  "flex",
  "h-6",
  "w-6",
  "border-2",
  "border-[#A3CC6A]",
  "shrink-0",
  "overflow-hidden",
  "rounded-full",
  "transition-colors",

  "hover:border-[#d2e6b6]",
]);
