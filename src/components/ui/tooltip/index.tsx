"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";
import * as S from './styles'

type TooltipProps = {
  content: string;
  children: React.ReactNode;
  className?: string;
} & TooltipPrimitive.TooltipContentProps;

export const Tooltip = ({
  className,
  children,
  content,
  ...props
}: TooltipProps) => {
  return (
    <TooltipPrimitive.Provider data-slot="tooltip-provider">
      <TooltipPrimitive.Root data-slot="tooltip" >
        <TooltipPrimitive.Trigger asChild data-slot="tooltip-trigger">
          <span>{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(
              S.content(),
              className
            )}
            data-slot="tooltip-content"
          sideOffset={8}
            {...props}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
