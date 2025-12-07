import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedLink } from "@/lib/services/shared-link";
import {
  AnimationSharePayload,
  decodeAnimationSharePayload,
  extractAnimationPayloadFromUrl,
} from "@/features/animation/share-utils";
import { AnimateSharedClient } from "@/features/animation/shared-view";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/utils/site-config";
import { cookies, headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createHash } from "crypto";

type SharedAnimationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: SharedAnimationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSharedLink(slug);

  if (!data?.url) {
    return {
      title: "Shared animation",
      description: "View animated code snippets from Jolly Code.",
    };
  }

  const encodedPayload = extractAnimationPayloadFromUrl(data.url);
  const payload = encodedPayload ? decodeAnimationSharePayload(encodedPayload) : null;
  const firstSlide = payload?.slides?.[0];

  const title = data.title || firstSlide?.title || "Shared animation";
  const description =
    data.description ||
    firstSlide?.code?.slice(0, 120)?.replace(/\s+/g, " ") ||
    "View animated code snippets from Jolly Code.";

  const ogImage = `/api/og-image?slug=${slug}`;

  return {
    title,
    description,
    openGraph: {
      images: [ogImage],
      title,
      description,
      type: "video.other",
    },
    twitter: {
      card: "player",
      title,
      description,
      images: [ogImage],
      players: [
        {
          playerUrl: `${siteConfig.url}/animate/embed/${slug}`,
          streamUrl: `${siteConfig.url}/animate/embed/${slug}`,
          width: 800,
          height: 450,
        },
      ],
    },
    alternates: {
      canonical: `/animate/shared/${slug}`,
      types: {
        "application/json+oembed": `/api/oembed?url=${encodeURIComponent(`${siteConfig.url}/animate/shared/${slug}`)}`,
      },
    },
  };
}

export default async function SharedAnimationPage({ params }: SharedAnimationPageProps) {
  const { slug } = await params;
  const data = await getSharedLink(slug);

  if (!data?.url) {
    return notFound();
  }

  const cookieStore = await cookies();
  const viewerCookie = cookieStore.get("jc_viewer_token")?.value;
  const headerStore = await headers();
  const fallbackTokenSource = `${headerStore.get("x-forwarded-for") ?? ""}|${headerStore.get("user-agent") ?? ""}`;
  const hashedFallback = createHash("sha256").update(fallbackTokenSource || slug).digest("hex");
  const viewerToken = viewerCookie ?? hashedFallback;

  const supabase = await createClient();
  const { data: viewResult, error: viewError } = await supabase.rpc(
    "record_public_share_view" as never,
    { p_owner_id: data.user_id, p_link_id: data.id, p_viewer_token: viewerToken }
  );

  if (viewError) {
    console.error("Failed to record public share view", viewError);
  }

  if (viewResult && (viewResult as any).allowed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-semibold">View limit reached</h1>
          <p className="text-muted-foreground">
            This shared link has reached its monthly view limit. Please ask the owner to upgrade their plan to enable more views.
          </p>
        </div>
      </div>
    );
  }

  const encodedPayload = extractAnimationPayloadFromUrl(data.url);
  if (!encodedPayload) {
    return notFound();
  }

  const payload = decodeAnimationSharePayload(encodedPayload) as AnimationSharePayload | null;

  if (!payload) {
    return notFound();
  }

  const title = data.title || payload.slides?.[0]?.title || "Shared animation";
  const datePublished = data.created_at;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: title,
          description: "A code animation created with Jolly Code",
          author: {
            "@type": "Organization",
            name: "Jolly Code",
          },
          datePublished,
          url: `https://jollycode.dev/animate/shared/${slug}`,
        }}
      />
      <AnimateSharedClient payload={payload} slug={slug} />
    </>
  );
}
