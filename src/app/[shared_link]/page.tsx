import { notFound, redirect } from "next/navigation";
import { getSharedLink, trackSharedLinkVisit } from "@/lib/services/shared-link";

type SharedLinkPageProps = {
  params: Promise<{
    shared_link: string;
  }>;
};

/**
 * Redirects to the original URL of the shared link.
 *
 * @param params - The props object containing the parameters.
 * @return {JSX.Element} Redirects to the original URL of the shared link.
 */
export default async function SharedLinkPage({ params }: SharedLinkPageProps) {
  const { shared_link } = await params;

  const data = await getSharedLink(shared_link);

  if (!data) {
    return notFound();
  }

  // Track visit asynchronously (fire and forget)
  trackSharedLinkVisit(data.id);

  // Track in PostHog
  const posthog = await import('posthog-js').then(m => m.default);
  if (posthog) {
    posthog.capture('view_shared_link', {
      short_url: shared_link,
      link_id: data.id,
    });
  }

  redirect(data.url);
}
