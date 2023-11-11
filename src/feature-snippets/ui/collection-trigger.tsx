import { AccordionTrigger } from "@/components/ui/accordion";
import React from "react";

type CollectionTriggerProps = {
  children: React.ReactNode;
};

export function CollectionTrigger({
  children,
  ...props
}: CollectionTriggerProps) {
  return (
    <AccordionTrigger {...props}>
      <h2 className="text-foreground text-left text-sm">{children}</h2>
    </AccordionTrigger>
  );
}
