import { notFound } from "next/navigation";
import { getSharedLink } from "@/lib/services/shared-link";
import { decodeAnimationSharePayload, extractAnimationPayloadFromUrl, AnimationSharePayload } from "@/features/animation/share-utils";
import { EmbedClientWrapper } from "./embed-client-wrapper";

type EmbedPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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
