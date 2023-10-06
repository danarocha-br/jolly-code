"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";
import * as S from "./styles";

type AvatarProps = {
  alt?: string;
  imageSrc?: string;
  username?: string;
  className?: string;
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
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(S.fallback(), className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, alt, imageSrc, username }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn(S.avatar(), className)}>
    <AvatarImage src={imageSrc} alt={alt} />
    {username && <AvatarFallback>{getInitials(username)}</AvatarFallback>}
  </AvatarPrimitive.Root>
));
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
