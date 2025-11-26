import { cva } from "class-variance-authority";

export const snippet = cva([
  "text-sm",
  "text-left",
  "text-foreground",
  "capitalize",
  "bg-background",
  "dark:bg-muted/20",
  "border",
  "border-border",
  "dark:border-border/30",
  "rounded-md",
  "outline-none",
  "flex",
  "gap-2",
  "px-3",
  "w-full",
  "transition-all",
  "group",

  "hover:bg-indigo-200/30",
  "dark:hover:bg-primary/10",
  "hover:border-indigo-300",
  "dark:hover:border-primary/50",
]);

export const addButton = cva([
  "bg-muted/50",
  "dark:bg-muted/20",
  "flex",
  "items-center",
  "gap-3",
  "w-full",
  "text-left",
  "text-sm",
  "px-2",
  "py-1",
  "mb-2",
  "rounded-md",
  "transition-colors",
  "hover:text-primary-foreground",
  "hover:bg-primary",
]);

export const emptyContainer = cva([
  "bg-background",
  "rounded-lg",
  "flex",
  "flex-col",
  "space-y-2",
  "items-center",
  "justify-center",
  "w-full",
  "px-4",
  "py-4",
  "opacity-80",
  'relative',
]);

export const emptyTitle = cva(
  ["text-foreground/90", "w-[250px]", "text-center", "transition-opacity"],
  {
    variants: {
      show: {
        true: ["opacity-100"],
        false: ["opacity-0"],
      },
    },
  }
);

export const emptyDescription = cva(
  [
    "text-center",
    "text-sm",
    "text-foreground/60",
    "transition-opacity",
    "delay-700",
    "px-4",
    "pb-3",
    "relative", "-top-3"
  ],
  {
    variants: {
      show: {
        true: ["opacity-100"],
        false: ["opacity-0"],
      },
    },
  }
);

export const emptyCard = cva([
  "bg-gradient-to-tr",
  "from-muted/80",
  "to-accent/40",
  "to-accent/40",
  "dark:from-muted/20",
  "border",
  "dark:border-border/40",
  "w-full",
  "rounded-md",
  "px-4",
  'pb-4',
  "flex",
  "flex-col",
  "items-center",
  "justify-center",
  "relative",
  '-top-8',
  "z-0",
  "h-[84px]"
]);

export const emptyIcon = cva([
  "w-10",
  "h-10",
  "bg-muted",
  "rounded-full",
  "flex",
  "items-center",
  "justify-center",
  "z-10"
]);

export const emptyLines = cva([
  "h-3",
  "w-full",
  "bg-subdued",
  "dark:bg-muted",
  "rounded-full",
]);
