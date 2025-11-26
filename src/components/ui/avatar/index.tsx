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

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(S.image(), className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  color,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  const isValidColor = /^#([0-9A-F]{3}){1,2}$/i.test(color || "");
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(S.fallback(), className)}
      style={{
        color: isValidColor
          ? getReadableColorForBackground(color || "")
          : "#fff",
        backgroundColor: color ? color : "hsl(260deg, 3.7%, 20%)",
      }}
      {...props}
    />
  );
}

function Avatar({
  className,
  alt,
  imageSrc,
  username,
  variant = "current-user",
  size = "sm",
  color,
}: AvatarProps,
) {
  return (
    <AvatarPrimitive.Root
      className={cn(S.avatar({ variant, size }), className)}
    >
      <AvatarImage src={imageSrc} alt={alt} />
      {username && (
        <AvatarFallback color={color}>{getInitials(username)}</AvatarFallback>
      )}
    </AvatarPrimitive.Root>
  );
}

export { Avatar };

function getInitials(username: string): string {
  const splitName = username.split(" ");
  let initials = splitName[0].charAt(0).toUpperCase();

  if (splitName.length > 1) {
    initials += splitName[1].charAt(0).toUpperCase();
  }

  return initials;
}
