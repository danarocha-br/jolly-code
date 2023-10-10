import { cva } from "class-variance-authority";

export const image = cva(["aspect-square", "h-full", "w-full"]);

export const fallback = cva([
  "text-xs",
  'text-white',
  "rounded-full",
  "flex",
  "h-full",
  "w-full",
  "items-center",
  "justify-center",
]);

export const avatar = cva(
  [
    "relative",
    "flex",
    "border-2",
    "shrink-0",
    "overflow-hidden",
    "rounded-full",
    "transition-colors",
  ],
  {
    variants: {
      variant: {
        "current-user": ["border-[#A3CC6A]", "hover:border-[#d2e6b6]"],
        "other-user": [],
      },
      size: {
        sm: ["h-6", "w-6"],
        md: ["h-8", "w-8"],
      },
    },
    defaultVariants: {
      variant: "current-user",
      size: "sm",
    }
  }
);
