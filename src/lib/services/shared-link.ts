import { createClient } from "@/utils/supabase/server";
import { isValidURL } from "@/lib/utils/is-valid-url";

export async function getSharedLink(slug: string) {
    if (!slug || !isValidURL(slug)) {
        return null;
    }

    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("links")
            .select("id, url, snippet_id")
            .eq("short_url", slug)
            .single();

        if (error || !data) {
            return null;
        }

        return data;
    } catch (error) {
        console.error("Error fetching shared link:", error);
        return null;
    }
}

export async function trackSharedLinkVisit(id: string) {
    if (!id) return;

    const supabase = await createClient();

    try {
        const { error } = await supabase.rpc("increment_link_visits", {
            link_id: id,
        });

        if (error) {
            console.error("Error tracking visit:", error);
        }
    } catch (error) {
        console.error("Error tracking visit:", error);
    }
}
