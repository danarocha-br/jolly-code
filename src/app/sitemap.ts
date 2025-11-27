import { MetadataRoute } from "next";

import { createClient } from "@/utils/supabase/server";
import { siteConfig } from "@/lib/utils/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();
    const { data: links } = await supabase.from("links").select("short_url, created_at");

    const sharedLinks =
        links?.map((link) => ({
            url: `${siteConfig.url}/${link.short_url}`,
            lastModified: new Date(link.created_at || new Date()),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        })) ?? [];

    return [
        {
            url: siteConfig.url,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        ...sharedLinks,
    ];
}
