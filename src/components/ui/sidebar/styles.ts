import { cva } from "class-variance-authority";

export const container = cva(
  [
    "relative",
    "items-center",
    "rounded-tr-[20px]",
    "rounded-br-[20px]",
    "mt-4",
    "mb-4",
    "pt-1",
    "flex",
    "flex-col",
    "sticky",
    "max-h-[calc(100vh-2rem)]",
    "left-0",
    "top-2",
    "bottom-2",
    "z-[999]",
  ],
  {
    variants: {
      isPresentational: {
        true: ["bg-subdued/50", "bg-blend-exclusion"],
        false: ["bg-subdued"],
      },
    },
  }
);

export const title = cva(
  ["mt-3", "text-accent-foreground/70", "transition-opacity"],
  {
    variants: {
      show: {
        true: ["opacity-100"],
        false: ["opacity-0"],
      },
    },
  }
);

export const logo = cva(
  [
    "top-[46%]",
    "-rotate-90",
    "scale-[.65]",
    "absolute",
    "transition-opacity",
    "grayscale",
  ],
  {
    variants: {
      show: {
        true: ["opacity-90", "dark:opacity-30"],
        false: ["opacity-0"],
      },
    },
    defaultVariants: {
      show: true,
    },
  }
);

export const logoShort = cva(
  [
    "scale-[.6]",
    "grayscale",
    "hover:grayscale-0",
    "hover:opacity-100",
    "transition-all",
    "cursor-pointer",
  ],
  {
    variants: {
      show: {
        true: ["opacity-70", "dark:opacity-30"],
        false: ["opacity-0"],
      },
    },
    defaultVariants: {
      show: true,
    },
  }
);

export const author = cva([
  "text-sm",
  "text-foreground",
  "whitespace-nowrap",
  "pt-2",
  "pl-2",
]);
