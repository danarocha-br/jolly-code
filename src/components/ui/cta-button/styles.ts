import { cva } from "class-variance-authority";

export const button = cva([
  "inline-flex",
  "items-center",
  "justify-center",
  "rounded-md",
  "text-sm",
  "font-medium",
  "tracking-normal",
  "transition-colors",
  "outline-none",
  "border-2",
  "border-border/50",
  "dark:border-border",
  "bg-transparent",
  "shadow-sm",
  "h-12",
  "rounded-md",
  "px-8",
  "relative",
  "transition-all",

  "hover:bg-[radial-gradient(circle_at_var(--x)_var(--y),_#F0F8F0,_#F7F0F7,_#F1E6F4)]",
  "dark:hover:bg-[radial-gradient(circle_at_var(--x)_var(--y),_#192119,_#201921,_#211A1E)]",
  "hover:box-decoration-slice",
  "hover:border-purple-400/20",

  "focus-visible:outline-none",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-muted",

  "disabled:pointer-events-none",
  "disabled:opacity-30",
]);


