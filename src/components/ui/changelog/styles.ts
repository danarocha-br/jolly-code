import { cva } from "class-variance-authority";

export const container = cva([
  "bg-muted",
  "p-3",
  "flex",
  "flex-col",
  "justify-center",
  "space-y-2",
  "divide-solid",
  "relative",
]);

export const header = cva(["text-lg", "text-center"]);

export const title = cva(["flex", "items-center", "gap-3", "mb-4"]);

export const link = cva([
  "text-violet-300",
  "text-sm",
  "relative",
  "w-full",
  "flex",
  "justify-end",
  "transition-colors",

  "hover:text-violet-400"
]);

export const loading = cva([
  "w-[380px]",
  "h-28",
  "flex",
  "items-center",
  "justify-center"
])
