import { ThemeProps } from "@/lib/themes-options";
import { FontsProps } from "@/lib/fonts-options";
import { AnimationSettings, AnimationSlide } from "@/types/animation";

export type AnimationSharePayload = {
  slides: AnimationSlide[];
  settings: AnimationSettings;
  editor: {
    backgroundTheme: ThemeProps;
    fontFamily: FontsProps;
    fontSize: number;
    showBackground: boolean;
  };
};

const safeEncode = (value: unknown) => {
  const json = JSON.stringify(value);
  if (typeof window !== "undefined" && typeof btoa === "function") {
    return btoa(encodeURIComponent(json));
  }
  return Buffer.from(encodeURIComponent(json), "utf-8").toString("base64");
};

const safeDecode = <T>(value: string): T | null => {
  try {
    const decoded =
      typeof window !== "undefined" && typeof atob === "function"
        ? atob(value)
        : Buffer.from(value, "base64").toString("utf-8");
    const parsed = decodeURIComponent(decoded);
    return JSON.parse(parsed) as T;
  } catch (error) {
    console.error("Failed to decode animation share payload", error);
    return null;
  }
};

export const encodeAnimationSharePayload = (payload: AnimationSharePayload) => {
  return safeEncode(payload);
};

export const decodeAnimationSharePayload = (encoded: string) => {
  return safeDecode<AnimationSharePayload>(encoded);
};

export const extractAnimationPayloadFromUrl = (rawUrl: string) => {
  if (!rawUrl) return null;

  // Custom animation payload prefix
  if (rawUrl.startsWith("animation:")) {
    return rawUrl.replace(/^animation:/, "");
  }

  try {
    const urlObj = new URL(rawUrl);
    const param = urlObj.searchParams.get("animation");
    if (param) return param;
  } catch {
    // Ignore parse errors for non-standard urls
  }

  return null;
};
