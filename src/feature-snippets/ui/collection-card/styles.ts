import { cva } from "class-variance-authority";

export const button = cva([
  "flex",
  "flex-col",
  "items-center",
  "border",
  "border-border/70",
  "rounded-md",
  "outline-none",
  "group/button",
  "transition-all",

  "hover:border-primary",
]);

export const editorContainer = cva([
  "w-full",
  "h-16",
  "bg-background",
  "dark:bg-muted/10",
  "px-4",
  "pt-4",
  "relative",
  "transition-colors",

  "group-hover/button:bg-primary/10",
]);

export const editorContent = cva([
  "rounded-tl-md",
  "rounded-tr-md",
  "overflow-hidden",
  "w-full",
  "h-full",
  "bg-foreground/5",
  "dark:bg-muted/20",
]);

export const editorHeader = cva([
  "w-full",
  "flex",
  "items-center",
  "justify-between",
  "h-5",
  "bg-foreground/10",
  "dark:bg-muted/30",
  "gap-1",
  "px-2",
]);

export const editorTitle = cva([
  "text-foreground",
  "dark:text-foreground/10",
  "text-xs",
  "text-center",
  "w-full",
  "truncate",
  "-ml-4",
]);

export const editorButtons = cva(["w-2", "h-2", "bg-muted", "rounded-full"]);
