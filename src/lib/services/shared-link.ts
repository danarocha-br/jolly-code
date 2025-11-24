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
            .select("id, url")
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
        const { data, error } = await supabase
            .from("links")
            .select("visits")
            .eq("id", id)
            .single();

        if (error || !data) {
            console.error("Error fetching visits:", error);
            return;
        }

        const currentVisits = data.visits || 0;
        const updatedVisitCount = currentVisits + 1;

        await supabase
            .from("links")
            .update({ visits: updatedVisitCount })
            .eq("id", id);
    } catch (error) {
        console.error("Error tracking visit:", error);
    }
}
