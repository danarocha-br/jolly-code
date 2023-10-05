import { useEffect, useState } from "react";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * A function that takes in multiple inputs of type ClassValue and returns the merged result.
 *
 * @param {...inputs} inputs - The inputs of type ClassValue that need to be merged.
 * @return {type} The merged result.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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