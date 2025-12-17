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
import { FriendlyError } from "@/components/errors/friendly-error";

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

  const headerStoreForMetadata = await headers();
  const host = headerStoreForMetadata.get("host") || "";
  const protocol = headerStoreForMetadata.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;
  const actualUrl = `${baseUrl}/animate/shared/${slug}`;
  const ogImage = `${baseUrl}/api/og-image?slug=${slug}`;
  const oembedUrl = `${baseUrl}/api/oembed?url=${encodeURIComponent(actualUrl)}`;

  return {
    title,
    description,
    openGraph: {
      url: actualUrl,
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
          playerUrl: `${protocol}://${host}/animate/embed/${slug}`,
          streamUrl: `${protocol}://${host}/animate/embed/${slug}`,
          width: 800,
          height: 450,
        },
      ],
    },
    alternates: {
      canonical: actualUrl,
      types: {
        "application/json+oembed": oembedUrl,
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
  // Only record view if user_id is present
  let viewResult: any = null;
  let viewError: any = null;
  
  if (data.user_id && data.id) {
    const result = await supabase.rpc(
      "record_public_share_view",
      { p_owner_id: data.user_id, p_link_id: data.id, p_viewer_token: viewerToken }
    );
    viewResult = result.data;
    viewError = result.error;

    if (viewError) {
      console.error("Failed to record public share view", viewError);
    }
  }

  const view = viewResult;

  if (view && view.allowed === false) {
    return (
      <FriendlyError
        title="View limit reached"
        description="This shared link has reached its monthly view limit. Please ask the owner to upgrade their plan to enable more views."
        className="min-h-screen"
      />
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
