"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import * as S from "./styles";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    label: string;
    iconSlot?: React.ReactNode;
  }
>(({ className, label, iconSlot, ...props }, ref) => (
  <>
    <SliderPrimitive.Root
      orientation="vertical"
      ref={ref}
      className={cn(
        S.root(),
        className
      )}
      {...props}
    >
      <span className={S.label()}>{label}</span>
      <span className={S.icon()}>{!!iconSlot && iconSlot}</span>

        <SliderPrimitive.Track className={S.track()}>
          <SliderPrimitive.Range className={S.range()} />
        </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={S.thumb()} />
    </SliderPrimitive.Root>
  </>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
