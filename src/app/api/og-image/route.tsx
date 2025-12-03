import { ImageResponse } from "next/og";

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

    console.log("OG Image Request - Payload length:", payloadParam?.length ?? 0, "Slug:", slugParam);

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

    const codeSnippet =
      (firstSlide?.code || fallbackSlide.code)?.split("\n").slice(0, 6).join("\n").slice(0, 200) ||
      fallbackSlide.code;

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)",
            fontFamily: '"Inter", sans-serif',
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "85%",
              borderRadius: "16px",
              background: "#1e1e2e",
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
                padding: "32px",
                height: "280px",
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "20px",
                  lineHeight: "1.5",
                  color: "#e2e8f0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {codeSnippet}
              </pre>
            </div>
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
  } catch (error) {
    console.error("OG image generation failed", error);
    return new ImageResponse(<div />, size);
  }
}
