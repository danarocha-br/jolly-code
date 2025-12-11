import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { notFound, redirect } from "next/navigation";

import { getSharedLink, trackSharedLinkVisit } from "@/lib/services/shared-link";
import { captureServerEvent } from "@/lib/services/tracking/server";
import { createClient } from "@/utils/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/utils/site-config";
import type { Database } from "@/types/database";

type SharedLinkPageProps = {
  params: Promise<{
    shared_link: string;
  }>;
};

export async function generateMetadata({ params }: SharedLinkPageProps): Promise<Metadata> {
  const { shared_link } = await params;
  const data = await getSharedLink(shared_link);

  if (!data || !data.snippet_id) {
    return {};
  }

  const supabase = await createClient();
  const { data: snippet } = await supabase
    .from("snippet")
    .select("title, code")
    .eq("id", data.snippet_id)
    .single();

  if (!snippet) return {};

  return {
    title: `${snippet.title} - ${siteConfig.title}`,
    description: `Check out this code snippet: ${snippet.title}`,
    openGraph: {
      title: snippet.title || 'Untitled Snippet',
      description: `Check out this code snippet: ${snippet.title || 'Untitled'}`,
      type: "article",
      images: [
        {
          url: siteConfig.imageUrl,
        },
      ],
    },
  };
}

export default async function SharedLinkPage({ params }: SharedLinkPageProps) {
  const { shared_link } = await params;

  const data = await getSharedLink(shared_link);

  if (!data) {
    return notFound();
  }

  const cookieStore = await cookies();
  const viewerCookie = cookieStore.get("jc_viewer_token")?.value;
  const headerStore = await headers();
  const fallbackTokenSource = `${headerStore.get("x-forwarded-for") ?? ""}|${headerStore.get("user-agent") ?? ""}`;
  const hashedFallback = createHash("sha256").update(fallbackTokenSource || shared_link).digest("hex");
  const viewerToken = viewerCookie ?? hashedFallback;

  const supabase = await createClient();
  let viewResult: Database['public']['Functions']['record_public_share_view']['Returns'] | null = null;
  
  // Only record view if user_id is present
  if (data.user_id) {
    const { data: viewData, error: viewError } = await supabase.rpc(
      "record_public_share_view",
      { p_owner_id: data.user_id, p_link_id: data.id, p_viewer_token: viewerToken }
    );

    if (viewError) {
      console.error("Failed to record public share view", viewError);
    } else {
      viewResult = viewData ?? null;
    }
  }

  const view = viewResult;

  if (view && view.allowed === false) {
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

  // If it's a snippet, render the preview page
  if (data.snippet_id) {
    const supabase = await createClient();
    const { data: snippet } = await supabase
      .from("snippet")
      .select("*")
      .eq("id", data.snippet_id)
      .single();

    if (snippet) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "SoftwareSourceCode",
              name: snippet.title || 'Untitled Snippet',
              programmingLanguage: snippet.language || 'plaintext',
              text: snippet.code || '',
              author: {
                "@type": "Person",
                name: "Jolly Code User",
              },
              dateCreated: snippet.created_at,
            }}
          />
          <div className="max-w-4xl w-full space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">{snippet.title}</h1>
              <p className="text-gray-400">Shared via Jolly Code</p>
            </div>

            <div className="rounded-lg border border-gray-800 bg-[#0c0c0e] p-6 overflow-x-auto">
              <pre className="font-mono text-sm">
                <code>{snippet.code}</code>
              </pre>
            </div>

            <div className="flex justify-center">
              <a
                href={data.url || "/"}
                className="px-6 py-3 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors"
              >
                Open in Editor
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  redirect(data.url || "/");
}
