export async function getChangelog() {
    try {
        const response = await fetch("https://canny.io/api/v1/entries/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                apiKey: process.env.NEXT_PUBLIC_CANNY_API_KEY,
            }),
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch changelog: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error fetching changelog:", error);
        throw error; // Re-throw to let React Query handle the error state
    }
}
