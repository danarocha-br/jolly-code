import { notFound } from "next/navigation";
import { getSharedLink } from "@/lib/services/shared-link";
import {
  AnimationSharePayload,
  decodeAnimationSharePayload,
  extractAnimationPayloadFromUrl,
} from "@/features/animation/share-utils";
import { AnimateSharedClient } from "@/features/animation/shared-view";

type SharedAnimationPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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

  return <AnimateSharedClient payload={payload} />;
}
