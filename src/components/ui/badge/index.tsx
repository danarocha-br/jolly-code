import React from "react";
import { type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils";
import * as S from "./styles";

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof S.badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp data-slot="badge" className={cn(S.badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge }
