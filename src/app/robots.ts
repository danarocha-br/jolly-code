import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/utils/site-config";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
        },
        sitemap: `${siteConfig.url}/sitemap.xml`,
    };
}
