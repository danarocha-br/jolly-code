import { ImageResponse } from "next/og";
import { highlightCodeForOG, renderStyledSegments, truncateCodeForOG } from "@/lib/utils/og-syntax-highlight";
import { getThemeColors } from "@/lib/og-theme-colors";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

type Slide = { title?: string; code?: string; language?: string };
type Payload = { slides?: Slide[]; editor?: { fontFamily?: string; backgroundTheme?: string } };

const safeDecodePayload = (raw: string | null): Payload | null => {
  if (!raw) return null;
  try {
    const decoded = atob(raw);
    return JSON.parse(decodeURIComponent(decoded)) as Payload;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payloadParam = searchParams.get("payload");
    const slugParam = searchParams.get("slug");
    const titleOverride = searchParams.get("title");
    const descriptionOverride = searchParams.get("description");

    let decodedPayload: Payload | null = null;
    let titleFromDb: string | undefined;
    let descriptionFromDb: string | undefined;

    // If slug is provided, fetch from database
    if (slugParam) {
      try {
        const [{ getSharedLink }, { extractAnimationPayloadFromUrl, decodeAnimationSharePayload }] = await Promise.all([
          import("@/lib/services/shared-link").then(m => ({ getSharedLink: m.getSharedLink })),
          import("@/features/animation/share-utils").then(m => ({ 
            extractAnimationPayloadFromUrl: m.extractAnimationPayloadFromUrl,
            decodeAnimationSharePayload: m.decodeAnimationSharePayload 
          }))
        ]);

        const data = await getSharedLink(slugParam);
        if (data?.url) {
          const encodedPayload = extractAnimationPayloadFromUrl(data.url);
          if (encodedPayload) {
            decodedPayload = decodeAnimationSharePayload(encodedPayload) as Payload | null;
            titleFromDb = data.title ?? undefined;
            descriptionFromDb = data.description ?? undefined;
          }
        }
      } catch {}
    } else if (payloadParam) {
      decodedPayload = safeDecodePayload(payloadParam);
    }

    const firstSlide = decodedPayload?.slides?.[0] || { 
      title: titleOverride || "Shared animation",
      code: "// No preview",
      language: "javascript",
    };

    const title = titleFromDb || titleOverride || firstSlide.title || "Shared animation";
    const rawCode = firstSlide.code || "// No code";
    const language = firstSlide.language || "javascript";
    const backgroundTheme = decodedPayload?.editor?.backgroundTheme || "sublime";
    
    // Truncate and highlight code
    const codeSnippet = truncateCodeForOG(rawCode, 10, 80);
    const styledSegments = highlightCodeForOG(codeSnippet, language, backgroundTheme);
    const renderableSegments = renderStyledSegments(styledSegments);
    const themeColors = getThemeColors(backgroundTheme);
    const background = "linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)";

    try {
      return new ImageResponse(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:"100%",height:"100%",background,position:"relative"}}>
          <div style={{display:"flex",flexDirection:"column",width:"85%",borderRadius:"16px",background:themeColors.background,boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 24px",background:"rgba(255,255,255,0.03)",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={{display:"flex",gap:"10px"}}>
                <div style={{width:"12px",height:"12px",borderRadius:"50%",background:"#ff5f56"}}/>
                <div style={{width:"12px",height:"12px",borderRadius:"50%",background:"#ffbd2e"}}/>
                <div style={{width:"12px",height:"12px",borderRadius:"50%",background:"#27c93f"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 16px",background:"rgba(255,255,255,0.05)",borderRadius:"8px",color:"#9ca3af",fontSize:"14px",fontWeight:500}}>{title}</div>
              <div style={{width:"56px"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",padding:"32px",height:"280px",overflow:"hidden",fontFamily:"monospace",fontSize:"18px",lineHeight:"1.6"}}>
              {renderableSegments.map((line,i)=><div key={i} style={{display:"flex",minHeight:"28.8px"}}>{line.segments.map((seg,j)=><span key={j} style={{color:seg.color}}>{seg.text}</span>)}{line.segments.length===0&&<span style={{color:"transparent"}}> </span>}</div>)}
            </div>
          </div>
          <div style={{position:"absolute",bottom:32,right:40,color:"#f8fafc",fontSize:"20px",fontWeight:600}}>jollycode.dev</div>
        </div>,
        {...size,headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}}
      );
    } catch {
      return new ImageResponse(<div/>,size);
    }
  } catch (error) {
    console.error("OG image generation failed", error);
    return new ImageResponse(<div />, size);
  }
}

