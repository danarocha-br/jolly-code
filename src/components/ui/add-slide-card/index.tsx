"use client";
import React from "react";
import { cn } from "@/lib/utils";

type AddSlideCardProps = {
  onAdd: () => void;
  disabled?: boolean;
};

export const AddSlideCard = React.memo(
  ({ onAdd, disabled = false }: AddSlideCardProps) => (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className={cn(
        "flex-shrink-0 w-48 h-32 rounded-lg border-2 border-dashed border-border/70",
        "bg-muted/20 hover:border-primary/60 hover:bg-primary/5 transition-colors",
        "flex items-center justify-center text-sm text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label="Add slide"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <i className="ri-add-line text-lg" />
        </div>
        <span className="font-medium">Add Slide</span>
      </div>
    </button>
  )
);

AddSlideCard.displayName = "AddSlideCard";
