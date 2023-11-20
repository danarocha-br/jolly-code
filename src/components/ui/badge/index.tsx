import React from "react";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import * as S from "./styles";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof S.badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(S.badgeVariants({ variant }), className)} {...props} />
  );
}
