export async function getChangelog() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Use absolute URL for server-side, relative for client-side
    const baseUrl = typeof window === 'undefined' 
      ? process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      : '';
    const url = `${baseUrl}/api/changelog`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
      if (error.name === "AbortError") {
        console.error("Changelog fetch timed out");
      } else {
        console.error("Error fetching changelog:", error.message);
      }
    }
    return { entries: [] };
  }
}
