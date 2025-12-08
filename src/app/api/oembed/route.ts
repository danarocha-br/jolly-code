import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/utils/site-config";
import { getSharedLink } from "@/lib/services/shared-link";
import { decodeAnimationSharePayload, extractAnimationPayloadFromUrl } from "@/features/animation/share-utils";
import { enforceRateLimit, publicLimiter } from "@/lib/arcjet/limiters";

export async function GET(request: NextRequest) {
	const limitResponse = await enforceRateLimit(publicLimiter, request, {
		tags: ["oembed"],
	});
	if (limitResponse) return limitResponse;

	const searchParams = request.nextUrl.searchParams;
	const urlParam = searchParams.get("url");

	if (!urlParam) {
		return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
	}

	// Parse the URL to get the slug
	let slug = "";
	try {
		const urlObj = new URL(urlParam);
		// Expected format: /animate/shared/[slug]
		const parts = urlObj.pathname.split("/");
		const sharedIndex = parts.indexOf("shared");
		if (sharedIndex !== -1 && parts.length > sharedIndex + 1) {
			slug = parts[sharedIndex + 1];
		}
	} catch (error) {
		return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
	}

	if (!slug) {
		return NextResponse.json({ error: "Could not parse slug from URL" }, { status: 400 });
	}

	// Fetch the shared link to get the title and dimensions
	const data = await getSharedLink(slug);
	if (!data) {
		return NextResponse.json({ error: "Link not found" }, { status: 404 });
	}

	// Default dimensions
	let width = 800;
	let height = 450;
	let title = data.title || "Shared Animation";

	// Try to decode payload for more accurate info
	if (data.url) {
		const encodedPayload = extractAnimationPayloadFromUrl(data.url);
		const payload = encodedPayload ? decodeAnimationSharePayload(encodedPayload) : null;
		if (payload?.slides?.[0]?.title) {
			title = payload.slides[0].title;
		}
	}

	const embedUrl = `${siteConfig.url}/animate/embed/${slug}`;

	// Return oEmbed JSON with CORS headers
	return NextResponse.json(
		{
			type: "rich",
			version: "1.0",
			title: title,
			provider_name: siteConfig.title,
			provider_url: siteConfig.url,
			width: width,
			height: height,
			html: `<iframe src="${embedUrl}" width="${width}" height="${height}" style="border:0; border-radius: 12px; overflow: hidden;" loading="lazy" allowfullscreen></iframe>`,
		},
		{
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		}
	);
}
