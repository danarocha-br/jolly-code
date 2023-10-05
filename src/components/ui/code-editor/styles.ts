import { cva } from "class-variance-authority";

export const header = cva(["flex", "gap-3", "items-center", "px-4", "py-2"], {
  variants: {
    editorPreferences: {
      default: ["bg-background/80", "dark:bg-background/20"],
      minimal: [],
    },
  },
  defaultVariants: {
    editorPreferences: "minimal",
  },
});

export const input = cva([
  "bg-transparent",
  "text-stone-500",
  "dark:text-stone-400",
  "text-md",
  "font-medium",
  "transition-colors",
  "w-full",
  "max-w-[100px]",

  "focus:outline-none",
  "hover:text-stone-700",
  "dark:hover:text-stone-300",
]);

export const background = cva([
  "mb-2",
  "transition-all",
  "ease-out",
  "rounded-[14px]",
  "relative",
]);

export const editorContainer = cva(
  [
    "lg:min-w-[320px]",
    "border-2",
    "rounded-xl",
    "shadow-high",
    "brightness-100",
    "overflow-hidden",
    "relative"
  ],
  {
    variants: {
      isDarkTheme: {
        true: [
          "dark:bg-[hsl(260deg,4%,6%)]/80",
          "dark:border-[hsl(260deg,4%,10%)]",
        ],
        false: ["bg-background/90", "border-[#E3DCD9]/60"],
      },
    },
  }
);

export const editor = cva([], {
  variants: {
    showLineNumbers: {
      true: ["ml-6"],
    },
  },
  defaultVariants: {
    showLineNumbers: true,
  },
});

export const lineNumbers = cva([
  "text-sm",
  "text-foreground/40",
  "dark:text-muted-foreground/40",
  "absolute",
]);

export const settingsButton = cva([
  "bg-muted",
  "shadow-md",
  "text-accent-foreground/60",
  "border-2",
  "border-background",
  "w-10",
  "h-10",
  "rounded-full",
  "flex",
  "items-center",
  "justify-center",

  "absolute",
  "-top-12",
  "-right-4",

  "opacity-0",
  "transition-all",
  "translate-x-1",
  "duration-300",

  "hover:bg-white",
  "dark:hover:bg-accent",

  "group-hover/editor:opacity-100",
  "group-hover/editor:translate-x-0",
]);

export const title = cva(
  [
    "flex",
    "items-center",

    "overflow-x-auto",
    "scrollbar-thin",
    "scrollbar-thumb-transparent",
    "scrollbar-corner-transparent",
    "scrollbar-track-transparent",
  ],
  {
    variants: {
      editorPreferences: {
        default: ["justify-center", "w-[calc(100%-130px)]"],
        minimal: [],
      },
    },
  }
);

export const widthButton = cva([
  "relative",
  "bottom-6",
  "whitespace-nowrap",
  "opacity-70",
  "transition-opacity",

  "hover:opacity-100",
  "hover:bg-transparent",
]);

export const bookmarkButton = cva([
  "absolute",
  "-top-9",
  "-right-2",
  "opacity-0",
  "transition-opacity",

  "group-hover/editor:opacity-100",
]);

export const resizableButton = cva([
  "absolute",
  "top-[calc(50%-17px)]",
  "text-foreground/30",
  "scale-100",
  "transition-all",

  "hover:text-foreground",
  "hover:scale-110",

]);
