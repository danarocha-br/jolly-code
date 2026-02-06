import { MetadataRoute } from "next";

import { siteConfig } from "@/lib/utils/site-config";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: siteConfig.title,
		short_name: "Jolly Code",
		description: siteConfig.description,
		start_url: "/",
		display: "standalone",
		background_color: "#09090b",
		theme_color: "#09090b",
		icons: [
			{
				src: "/favicon.ico",
				sizes: "any",
				type: "image/x-icon",
			},
		],
	};
}
