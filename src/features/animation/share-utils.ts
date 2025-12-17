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
    showLineNumbers: boolean;
    editor: "default" | "minimal";
  };
};

const safeEncode = (value: unknown) => {
  const json = JSON.stringify(value);
  if (typeof btoa === "function") {
    return btoa(encodeURIComponent(json));
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(encodeURIComponent(json), "utf-8").toString("base64");
  }

  return "";
};

const safeDecode = <T>(value: string): T | null => {
  try {
    const decoder =
      typeof atob === "function"
        ? atob
        : typeof Buffer !== "undefined"
          ? (val: string) => Buffer.from(val, "base64").toString("utf-8")
          : null;

    if (!decoder) {
      return null;
    }

    const decoded = decoder(value);
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

export type EmbedOptions = {
  width?: number | string;
  height?: number | string;
};

export const generateEmbedCode = (url: string, options: EmbedOptions = {}) => {
  if (!url) return "";
  const width = options.width ?? "100%";
  const height = options.height ?? 420;

  // Use the embed route if it's a shared animation link
  const embedUrl = url.replace("/animate/shared/", "/animate/embed/");

  return `<iframe src="${embedUrl}" width="${width}" height="${height}" style="border:0; border-radius: 12px; overflow: hidden;" loading="lazy" allowfullscreen></iframe>`;
};

type PlatformTarget = "hashnode" | "medium" | "devto" | "notion";

export const generatePlatformUrl = (
  platform: PlatformTarget,
  url: string,
  title: string
) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/17c92283-0a96-4e7e-a254-0870622a7b75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-utils.ts:102',message:'generatePlatformUrl - entry',data:{platform,url,title,encodedUrl,encodedTitle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion

  switch (platform) {
    case "hashnode":
      // Hashnode supports HTML embeds - return iframe code
      return "iframe"; // Special marker to use iframe code
    case "devto":
      // Dev.to auto-generates preview cards when you paste the URL
      return url;
    case "medium":
      // Medium auto-generates preview cards when you paste the URL
      return url;
    case "notion":
      // Notion automatically embeds URLs when pasted - just return the direct URL
      // Notion will fetch the page and use oEmbed or Open Graph meta tags
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/17c92283-0a96-4e7e-a254-0870622a7b75',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-utils.ts:121',message:'generatePlatformUrl - Notion URL (direct)',data:{notionUrl:url,originalUrl:url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      return url;
    default:
      return url;
  }
};

type SocialPlatform = "twitter" | "linkedin";

export const generateSocialShareUrl = (
  platform: SocialPlatform,
  url: string,
  title: string,
  description?: string
) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = description ? encodeURIComponent(description) : "";

  if (platform === "twitter") {
    const text = encodedDescription
      ? `${encodedTitle}%0A${encodedDescription}`
      : encodedTitle;

    return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
  }

  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}${encodedDescription ? `&summary=${encodedDescription}` : ""
    }`;
};
