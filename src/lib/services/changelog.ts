export async function getChangelog() {
    try {
        const apiKey = process.env.NEXT_PUBLIC_CANNY_API_KEY;

        if (!apiKey) {
            console.warn("NEXT_PUBLIC_CANNY_API_KEY is not configured");
            return { entries: [] }; // Return empty result instead of throwing
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch("https://canny.io/api/v1/entries/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                apiKey,
            }),
            next: { revalidate: 3600 }, // Cache for 1 hour
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch changelog: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                console.error("Changelog fetch timed out");
            } else {
                console.error("Error fetching changelog:", error.message);
            }
        }
        // Return empty result instead of throwing to prevent SSR failures
        return { entries: [] };
    }
}
