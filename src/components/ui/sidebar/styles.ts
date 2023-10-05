import { cva } from "class-variance-authority";

export const container = cva(
  [
    "relative",
    "justify-center",
    "rounded-tr-[20px]",
    "rounded-br-[20px]",
    "mt-4",
    "mb-4",
    "pt-1",
    "flex",
    "sticky",
    "left-0",
    "top-2",
    "bottom-2",
    "z-[999]"
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

export const logo = cva(
  [
    "tracking-wider",
    "whitespace-nowrap",
    "absolute",
    "top-[46%]",
    "-rotate-90",
    "absolute",
    "-right-3",
    "transition-opacity",
    "duration-300",
  ],
  {
    variants: {
      show: {
        true: ["opacity-50"],
        false: ["opacity-0"],
      },
    },
    defaultVariants: {
      show: true,
    },
  }
);

export const author = cva(
  [
    "absolute",
    "left-4",
    "bottom-8",
    "text-xs",
    "whitespace-nowrap",
    "transition-opacity",
  ],
  {
    variants: {
      show: {
        true: ["opacity-50", "delay-200"],
        false: ["opacity-0"],
      },
    },
    defaultVariants: {
      show: true,
    },
  }
);
