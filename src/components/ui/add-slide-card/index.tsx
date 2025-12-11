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
        "flex-shrink-0 w-48 h-32 rounded-lg border-2 border-dashed border-border dark:border-border/70",
        "bg-card dark:bg-muted/20 hover:border-brand/40 dark:hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors",
        "flex items-center justify-center text-sm text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-2 focus-visible:border-brand/40 dark:focus-visible:border-primary",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-card"
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
