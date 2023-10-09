import { cva } from "class-variance-authority";

export const container = cva([
  "flex",
  "flex-col",
  "justify-center",
  "space-y-2",
  "divide-solid",
  "relative",
]);

export const header = cva(["text-base", "pt-3"]);

export const title = cva(["text-sm", "flex", "items-center", "gap-3", "mb-4"]);

export const link = cva([
  "text-violet-300",
  "text-sm",
  "relative",
  "w-full",
  "flex",
  "justify-end",
  "transition-colors",

  "hover:text-violet-400",
]);

export const loading = cva([
  "w-full",
  "h-28",
  "flex",
  "items-center",
  "justify-center",
]);

export const ctaCard = cva([
  "flex",
  "flex-col",
  "items-center",
  "justify-center",
  "border",
  "border-success",
  "rounded-md",
]);

export const ctaTitle = cva([
  "text-sm",
  "text-center",
  "w-full",
  "border-b",
  "border-success",
  "py-1",
]);

export const ctaLink = cva([
  "py-4",
  "bg-muted",
  "w-full",
  "rounded-b-md",
  "text-center",
  "transition-colors",

  "hover:bg-success/10",
]);
