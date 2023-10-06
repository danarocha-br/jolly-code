import React, { useEffect, useRef, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion, useMotionValue } from "framer-motion";

import * as S from "./styles";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const CtaButton = ({
  className,
  asChild = false,
  ...props
}: ButtonProps) => {
  const [coordinates, setCoordinates] = useState({ x: "0px", y: "0px" });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCoordinates({ x: `${x}px`, y: `${y}px` });
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      className={S.button()}
      style={
        {
          "--x": coordinates.x,
          "--y": coordinates.y,
        } as React.CSSProperties
      }
      {...props}
    >
      {props.children}
    </button>
  );
};

CtaButton.displayName = "CtaButton";
