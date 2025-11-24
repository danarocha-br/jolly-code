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
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    await queryClient.prefetchQuery({
      queryKey: ["collections"],
      queryFn: async () => {
        const result = await getCollections();
        return result.data || [];
      },
    });
  }

  await queryClient.prefetchQuery({
    queryKey: ["changelogs"],
    queryFn: getChangelog,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Room>
        <Home />
      </Room>
    </HydrationBoundary>
  );
}
