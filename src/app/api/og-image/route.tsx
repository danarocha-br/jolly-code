import { ImageResponse } from "next/og";
import { highlightCodeForOG, renderStyledSegments, truncateCodeForOG } from "@/lib/utils/og-syntax-highlight";
import { getThemeColors } from "@/lib/og-theme-colors";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

type Slide = {
  title?: string;
  code?: string;
  language?: string;
};

type Payload = {
  slides?: Slide[];
  editor?: { fontFamily?: string };
};

const safeDecodePayload = (raw: string | null): Payload | null => {
  if (!raw) return null;

  const decode = (value: string) => {
    try {
      // Next.js automatically URL-decodes searchParams, so we just need to base64 decode
      if (typeof atob === "function") {
        const decoded = atob(value);
        return decodeURIComponent(decoded);
      }
      if (typeof Buffer !== "undefined") {
        const decoded = Buffer.from(value, "base64").toString("utf-8");
        return decodeURIComponent(decoded);
      }
      return "";
    } catch (error) {
      console.error("Failed to decode base64:", error);
      return "";
    }
  };

  try {
    const json = decode(raw);
    if (!json) return null;
    return JSON.parse(json) as Payload;
  } catch (error) {
    console.error("Failed to parse JSON from decoded payload:", error);
    return null;
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payloadParam = searchParams.get("payload");
    const slugParam = searchParams.get("slug");
    const titleOverride = searchParams.get("title") ?? undefined;
    const descriptionOverride = searchParams.get("description") ?? undefined;
    const mode = searchParams.get("mode") ?? "social"; // "social" or "embed"

    let decodedPayload: Payload | null = null;
    let titleFromDb: string | undefined;
    let descriptionFromDb: string | undefined;

    // If slug is provided, fetch from database
    if (slugParam) {
      try {
        const { getSharedLink } = await import("@/lib/services/shared-link");
        const { extractAnimationPayloadFromUrl, decodeAnimationSharePayload } = await import("@/features/animation/share-utils");

        const data = await getSharedLink(slugParam);
        if (data?.url) {
          const encodedPayload = extractAnimationPayloadFromUrl(data.url);
          if (encodedPayload) {
            decodedPayload = decodeAnimationSharePayload(encodedPayload) as Payload | null;
            titleFromDb = data.title ?? undefined;
            descriptionFromDb = data.description ?? undefined;
          }
        }
      } catch (error) {
        console.error("Failed to fetch shared link:", error);
      }
    } else if (payloadParam) {
      // Otherwise use the payload parameter
      decodedPayload = safeDecodePayload(payloadParam);

      if (!decodedPayload) {
        console.error("Failed to decode payload parameter");
      }
    }

    const fallbackSlide: Slide = {
      title: titleOverride || "Shared animation",
      code: "// No preview available. Generate a link to see your animation here.",
      language: "typescript",
    };

    const firstSlide = decodedPayload?.slides?.[0] ?? fallbackSlide;

    const title = titleFromDb || titleOverride || firstSlide?.title || "Shared animation";
    const description =
      descriptionFromDb || descriptionOverride || decodedPayload?.editor?.fontFamily || "Bring your code to life with animated snippets.";

    // Get the full code and language
    const rawCode = firstSlide?.code || fallbackSlide.code || "// No code available";
    const language = firstSlide?.language || "typescript";
    
    // Truncate code to fit in OG image
    const codeSnippet = truncateCodeForOG(rawCode, 10, 80);

    // Get the background theme from payload
    const backgroundTheme = (decodedPayload as any)?.editor?.backgroundTheme || "sublime";
    
    // Get syntax-highlighted code segments
    const styledSegments = highlightCodeForOG(codeSnippet, language, backgroundTheme);
    const renderableSegments = renderStyledSegments(styledSegments);
    
    // Get theme colors for the code window background
    const themeColors = getThemeColors(backgroundTheme);

    // Theme background mapping (matching themes-options.ts)
    const themeBackgrounds: Record<string, string> = {
      sublime: "linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)",
      hyper: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)",
      dracula: "linear-gradient(135deg, #ff79c6 0%, #bd93f9 50%, #6272a4 100%)",
      monokai: "linear-gradient(135deg, #f92672 0%, #66d9ef 50%, #a6e22e 100%)",
      nord: "linear-gradient(135deg, #88c0d0 0%, #81a1c1 50%, #5e81ac 100%)",
      gotham: "linear-gradient(135deg, #2aa889 0%, #599cab 50%, #4e5165 100%)",
      blue: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)",
      nightOwl: "linear-gradient(135deg, #c792ea 0%, #7fdbca 50%, #82aaff 100%)",
    };

    // Choose background based on mode
    const background = mode === "embed"
      ? (themeBackgrounds[backgroundTheme] || themeBackgrounds.sublime) // Use theme gradient for embed
      : "linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)"; // Default gradient for social

    try {
      const imageResponse = new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background,
            fontFamily: '"Inter", sans-serif',
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "85%",
              borderRadius: "16px",
              background: themeColors.background,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              overflow: "hidden",
            }}
          >
            {/* Window Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
                background: "rgba(255, 255, 255, 0.03)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* Window Controls */}
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56" }} />
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e" }} />
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f" }} />
              </div>

              {/* Title Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "8px",
                  color: "#9ca3af",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {title}
              </div>

              {/* Spacer for centering */}
              <div style={{ width: "56px" }} />
            </div>

            {/* Code Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "32px",
                height: "280px",
                overflow: "hidden",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "18px",
                lineHeight: "1.6",
              }}
            >
              {renderableSegments.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  style={{
                    display: "flex",
                    minHeight: "28.8px",
                  }}
                >
                  {line.segments.map((segment, segmentIndex) => (
                    <span key={segmentIndex} style={{ color: segment.color }}>
                      {segment.text}
                    </span>
                  ))}
                  {line.segments.length === 0 && <span style={{ color: "transparent" }}> </span>}
                </div>
              ))}
            </div>
          </div>

          {/* Watermark */}
          <div
            style={{
              position: "absolute",
              bottom: 32,
              right: 40,
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#f8fafc",
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            <span>jollycode.dev</span>
          </div>
        </div>
      ),
      {
        ...size,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
      );
      return imageResponse;
    } catch (error) {
      console.error("OG image generation failed", error);
      return new ImageResponse(<div />, size);
    }
  } catch (error) {
    console.error("OG image generation failed", error);
    return new ImageResponse(<div />, size);
  }
}
