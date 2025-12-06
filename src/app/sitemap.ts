import { MetadataRoute } from "next";

import { createClient } from "@/utils/supabase/server";
import { siteConfig } from "@/lib/utils/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();
    const { data: links } = await supabase.from("links").select("short_url, created_at, url");

    const sharedLinks =
        links?.map((link) => {
            const isAnimation = link.url?.startsWith("animation:");
            const path = isAnimation ? `/animate/shared/${link.short_url}` : `/${link.short_url}`;

            return {
                url: `${siteConfig.url}${path}`,
                lastModified: new Date(link.created_at || new Date()),
                changeFrequency: "weekly" as const,
                priority: 0.8,
            };
        }) ?? [];

    return [
        {
            url: siteConfig.url,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${siteConfig.url}/animate`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        ...sharedLinks,
    ];
}
