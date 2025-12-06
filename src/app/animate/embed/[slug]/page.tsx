import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSharedLink } from "@/lib/services/shared-link";
import { decodeAnimationSharePayload, extractAnimationPayloadFromUrl, AnimationSharePayload } from "@/features/animation/share-utils";
import { EmbedClientWrapper } from "./embed-client-wrapper";

type EmbedPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSharedLink(slug);

  if (!data?.url) {
    return {
      title: "Embedded Animation",
      description: "View animated code from Jolly Code.",
    };
  }

  const encodedPayload = extractAnimationPayloadFromUrl(data.url);
  const payload = encodedPayload ? decodeAnimationSharePayload(encodedPayload) : null;
  const firstSlide = payload?.slides?.[0];

  const title = data.title || firstSlide?.title || "Embedded Animation";
  const description =
    data.description ||
    firstSlide?.code?.slice(0, 120)?.replace(/\s+/g, " ") ||
    "View animated code from Jolly Code.";

  const ogImage = `/api/og-image?slug=${slug}&mode=embed`;

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
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function EmbedPage({ params }: EmbedPageProps) {
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

  return <EmbedClientWrapper payload={payload} slug={slug} />;
}
