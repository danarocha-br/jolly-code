"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { readableColor } from "polished";

import { cn } from "@/lib/utils";
import * as S from "./styles";

function getReadableColorForBackground(backgroundColor: string) {
  return readableColor(backgroundColor);
}

type AvatarProps = {
  alt?: string;
  imageSrc?: string;
  username?: string;
  className?: string;
  variant?: "current-user" | "other-user";
  size?: "sm" | "md";
  color?: string;
};

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn(S.image(), className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, color, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(S.fallback(), className)}
    style={{
      color: color ? getReadableColorForBackground(color) : "#fff",
      backgroundColor: color ? color : "hsl(260deg, 3.7%, 20%)",
    }}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(
  (
    {
      className,
      alt,
      imageSrc,
      username,
      variant = "current-user",
      size = "sm",
      color,
    },
    ref
  ) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(S.avatar({ variant, size }), className)}
    >
      <AvatarImage src={imageSrc} alt={alt} />
      {username && (
        <AvatarFallback color={color}>{getInitials(username)}</AvatarFallback>
      )}
    </AvatarPrimitive.Root>
  )
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

export { Avatar };

function getInitials(username: string): string {
  const splitName = username.split(" ");
  let initials = splitName[0].charAt(0).toUpperCase();

  if (splitName.length > 1) {
    initials += splitName[1].charAt(0).toUpperCase();
  }

  return initials;
}
