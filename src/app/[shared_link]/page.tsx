import { notFound, redirect } from "next/navigation";
import { getSharedLink, trackSharedLinkVisit } from "@/lib/services/shared-link";
import { captureServerEvent } from "@/lib/services/tracking/server";

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

  // Track in PostHog from the server to avoid client bundle on redirect
  void captureServerEvent('view_shared_link', {
    properties: {
      short_url: shared_link,
      link_id: data.id,
      destination: data.url,
    },
    distinctId: data.id,
  })

  redirect(data.url);
}
