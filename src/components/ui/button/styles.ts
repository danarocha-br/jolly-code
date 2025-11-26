import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium tracking-normal transition-colors outline-none focus-visible:outline-none focus-visible:outline-offset-2 focus-visible:outline-muted disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-muted dark:hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost:
          "hover:bg-card dark:hover:bg-accent/30 dark:hover:text-accent-foreground focus-visible:outline-offset-1 focus-visible:outline-muted/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-sm",
        lg: "h-12 rounded-md px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
