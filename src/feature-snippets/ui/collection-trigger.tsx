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

type CollectionTriggerProps = {
  children: React.ReactNode;
  title: string;
  onUpdate?: () => void;
  onRemove?: () => void;
};

export function CollectionTrigger({
  children,
  title,
  onUpdate,
  onRemove,
  ...props
}: CollectionTriggerProps) {
  return (
    <div className="relative w-full group">
      <AccordionTrigger {...props} className="flex items-center w-full ">
        <h2 className="text-foreground text-left text-sm capitalize">
          {children}
        </h2>
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
