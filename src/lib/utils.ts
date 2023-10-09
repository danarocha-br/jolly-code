import { useEffect, useState } from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type SpaceMember } from "@ably/spaces";
import { generate } from "random-words";
/**
 * A function that takes in multiple inputs of type ClassValue and returns the merged result.
 *
 * @param {...inputs} inputs - The inputs of type ClassValue that need to be merged.
 * @return {type} The merged result.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a boolean value indicating whether the given media query matches the current viewport.
 *
 * @param {string} query - The media query to evaluate.
 * @return {boolean} - True if the media query matches the viewport, false otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  function handleChange() {
    setMatches(getMatches(query));
  }

  useEffect(() => {
    const matchMedia = window.matchMedia(query);

    // Triggered at the first client-side load and if query changes
    handleChange();

    // Listen matchMedia
    if (matchMedia.addListener) {
      matchMedia.addListener(handleChange);
    } else {
      matchMedia.addEventListener("change", handleChange);
    }

    return () => {
      if (matchMedia.removeListener) {
        matchMedia.removeListener(handleChange);
      } else {
        matchMedia.removeEventListener("change", handleChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return matches;
}

export const REMOVE_USER_AFTER_MILLIS = 120_000;
export const MAX_USERS_BEFORE_LIST = 4;
export const HORIZONTAL_SPACING_OFFSET = 40;
export const OVERLAP_AMOUNT = 40;
export const AVATAR_WIDTH = 48;

export type Member = Omit<SpaceMember, "profileData"> & {
  profileData: { memberColor: string; name: string };
};

export const getSpaceNameFromUrl = () => {
  const url = new URL(window.location.href);
  const spaceNameInParams = url.searchParams.get("space");

  if (spaceNameInParams) {
    return spaceNameInParams;
  } else {
    const generatedName = generate({ exactly: 3, join: "-" });
    url.searchParams.set("space", generatedName);
    window.history.replaceState({}, "", `?${url.searchParams.toString()}`);
    return generatedName;
  }
};

export function calculateRightOffset({
  usersCount,
  index = 0,
}: {
  usersCount: number;
  index: number;
}): number {
  return usersCount > MAX_USERS_BEFORE_LIST
    ? (index + 1) * HORIZONTAL_SPACING_OFFSET
    : index * HORIZONTAL_SPACING_OFFSET;
}

export function calculateTotalWidth({ users }: { users: Member[] }): number {
  return (
    AVATAR_WIDTH +
    OVERLAP_AMOUNT * Math.min(users.length, MAX_USERS_BEFORE_LIST + 1)
  );
}

export const memberColors = [
  "bg-purple-400",
  "bg-purple-500",
  "bg-purple-600",
  "bg-purple-700",
  "bg-pink-500",
  "bg-pink-600",
  "bg-pink-700",
  "bg-blue-500",
  "bg-blue-600",
  "bg-blue-700",
  "bg-green-500",
  "bg-green-600",
  "bg-green-700",
  "bg-yellow-600",
  "bg-yellow-700",
];

export const getMemberColor = () =>
  memberColors[Math.floor(Math.random() * memberColors.length)];
