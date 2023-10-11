import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A function that takes in multiple inputs of type ClassValue and returns the merged result.
 *
 * @param {...inputs} inputs - The inputs of type ClassValue that need to be merged.
 * @return {type} The merged result.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
