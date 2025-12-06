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
