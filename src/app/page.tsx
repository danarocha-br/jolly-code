import { Room } from "./room";
import { Home } from "@/feature-home";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/query-client";
import { getCollections } from "@/actions";
import { createClient } from "@/utils/supabase/server";
import { getChangelog } from "@/lib/services/changelog";

export default async function Index() {
  const queryClient = getQueryClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: ["collections"],
      queryFn: async () => {
        const result = await getCollections();
        return result.data || [];
      },
    });
  }

  // Prefetch changelog, but don't block page render if it fails
  try {
    await queryClient.prefetchQuery({
      queryKey: ["changelogs"],
      queryFn: getChangelog,
    });
  } catch (error) {
    // Log error but allow page to render
    console.error("Failed to prefetch changelog during SSR:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Room user={user ?? null}>
        <div>
          <Home />
        </div>
      </Room>
    </HydrationBoundary>
  );
}
