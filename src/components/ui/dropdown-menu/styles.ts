import { cva } from "class-variance-authority";

export const content = cva([
  "text-popover-foreground",
  "bg-popover",
  "border",
  "border-border/50",
  "rounded-md",
  "shadow-md",
  "p-1",
  "z-50",
  "min-w-[8rem]",
  "overflow-hidden",

  "data-[state=open]:fade-in-0",
  "data-[state=open]:animate-in",
  "data-[state=open]:zoom-in-95",

  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=closed]:zoom-out-95",

  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2",
  "data-[side=top]:slide-in-from-bottom-2",
]);

export const menuItem = cva([
  "relative",
  "cursor-default",
  "flex",
  "select-none",
  "items-center",
  "justify-between",
  "w-full",
  "rounded-sm",
  "px-2",
  "py-1.5",
  "text-sm",
  "outline-none",
  "transition-colors",

  "focus:bg-accent",
  "focus:text-accent-foreground",

  "data-[disabled]:pointer-events-none",
  "data-[disabled]:opacity-50",
]);

export const label = cva(["px-2", "py-1.5", "text-sm", "font-medium", "text-foreground/50"]);

export const shortcut = cva([
  "ml-auto",
  "text-xs",
  "tracking-widest",
  "opacity-60",
]);

export const radio = cva([
  "cursor-pointer",
  "text-sm",
  "rounded-sm",
  "relative",
  "flex",
  "items-center",
  "select-none",
  "py-1.5",
  "pl-8",
  "pr-2",
  "outline-none",
  "transition-colors",

  "focus:bg-accent",
  "focus:text-accent-foreground",
  "data-[disabled]:pointer-events-none",
  "data-[disabled]:opacity-50",
]);

export const checkbox = cva([
  "text-sm",
  "relative",
  "cursor-pointer",
  "select-none",
  "flex",
  "items-center",
  "rounded-sm",
  "py-1.5",
  "pl-8",
  "pr-2",
  "outline-none",
  "transition-colors",

  "focus:bg-accent",
  "focus:text-accent-foreground",
  "data-[disabled]:pointer-events-none",
  "data-[disabled]:opacity-50",
]);

export const indicator = cva([
  "absolute",
  "left-2",
  "h-3.5",
  "w-3.5",
  "flex",
  "items-center",
  "justify-center",
]);

export const subTrigger = cva([
  "text-sm",
  "cursor-default",
  "select-none",
  "flex",
  "items-center",
  "rounded-sm",
  "px-2",
  "py-1.5",
  "outline-none",

  "focus:bg-accent",

  "data-[state=open]:bg-accent",
]);

export const subContent = cva([
  "z-50",
  "min-w-[8rem]",
  "overflow-hidden",
  "rounded-md",
  "border",
  "bg-popover",
  "p-1",
  "text-popover-foreground",
  "shadow-lg",

  "data-[state=open]:animate-in",
  "data-[state=open]:fade-in-0",
  "data-[state=open]:zoom-in-95",

  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=closed]:zoom-out-95",

  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2",
  "data-[side=top]:slide-in-from-bottom-2",
]);
