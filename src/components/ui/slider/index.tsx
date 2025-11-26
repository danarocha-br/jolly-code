"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import * as S from "./styles";

function Slider({
  className,
  label,
  iconSlot,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  label: string;
  iconSlot?: React.ReactNode;
}) {
  return (
    <>
      <SliderPrimitive.Root
        data-slot="slider"
        orientation="vertical"
        className={cn(
          S.root(),
          className
        )}
        {...props}
      >
        <span data-slot="slider-label" className={S.label()}>{label}</span>
        <span data-slot="slider-icon" className={S.icon()}>{!!iconSlot && iconSlot}</span>

        <SliderPrimitive.Track data-slot="slider-track" className={S.track()}>
          <SliderPrimitive.Range data-slot="slider-range" className={S.range()} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb data-slot="slider-thumb" className={S.thumb()} />
      </SliderPrimitive.Root>
    </>
  )
};

export { Slider };
