import * as React from "react";

import { cn } from "@/lib/utils";
import * as S from "./styles";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

function Input({ className, type, ...props }: React.ComponentProps<"input">) {

  return (
    <input
      type={type}
      className={cn(S.input(), className)}
      {...props}
    />
  );
}

export { Input };
