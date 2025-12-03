import React from "react";

import { AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type CollectionTriggerProps = {
  children: React.ReactNode;
  title: string;
  onUpdate?: () => void;
  onRemove?: () => void;
  isDropTarget?: boolean;
  isBusy?: boolean;
};

export function AnimationCollectionTrigger({
  children,
  title,
  onUpdate,
  onRemove,
  isDropTarget = false,
  isBusy = false,
  ...props
}: CollectionTriggerProps) {
  return (
    <div className="relative w-full group">
      <AccordionTrigger
        {...props}
        className={cn(
          "flex items-center w-full focus:outline-none focus-visible:bg-indigo-200/30 dark:focus-visible:bg-primary/5 transition-colors",
          isDropTarget && "border border-dashed bg-indigo-200/30 border-indigo-200 dark:border-primary/50 dark:bg-primary/5"
        )}
      >
        <h2 className="text-foreground text-left text-sm capitalize">
          {children}
        </h2>

        {isBusy && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-primary">
            <i className="ri-loader-4-fill animate-spin" />
          </span>
        )}
      </AccordionTrigger>

      {title !== "Home" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-0"
            >
              <i className="ri-more-line text-lg" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onUpdate}>
              <i className="ri-input-method-line mr-3" /> Rename folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove}>
              <div>
                <i className="ri-folder-reduce-line mr-3" />
                Remove
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
