import { cva } from "class-variance-authority";

export const container = cva([
  "rounded-xl",
  "border",
  "bg-card",
  "text-card-foreground",
  "shadow",
]);

export const header = cva(["flex", "flex-col", "space-y-1.5", "p-2"]);

export const title = cva(["font-semibold", "leading-none", "tracking-tight"]);

export const content = cva(["p-2"]);
