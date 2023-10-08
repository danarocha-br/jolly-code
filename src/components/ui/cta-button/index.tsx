import React, { useCallback, useRef, useState } from "react";

import * as S from "./styles";

export type ButtonProps = {
  label: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const CtaButton = ({ className, label, ...props }: ButtonProps) => {
  const [coordinates, setCoordinates] = useState({ x: "0px", y: "0px" });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCoordinates({ x: `${x}px`, y: `${y}px` });
    },
    [buttonRef, setCoordinates]
  );

  return (
    <button
      type="button"
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      className={S.button()}
      style={
        {
          "--x": coordinates.x,
          "--y": coordinates.y,
        } as React.CSSProperties
      }
      aria-label={label}
      {...props}
    >
      {props.children}
    </button>
  );
};

CtaButton.displayName = "CtaButton";
