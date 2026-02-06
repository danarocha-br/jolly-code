const CANNY_ENTRIES_URL = "https://canny.io/api/v1/entries/list";

export async function getChangelog() {
  // For server-side requests, call Canny API directly to avoid Arcjet rate limiting
  if (typeof window === 'undefined') {
    try {
      const apiKey = process.env.CANNY_API_KEY;

      if (!apiKey) {
        console.error("CANNY_API_KEY environment variable is not set");
        return { entries: [] };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const upstream = await fetch(CANNY_ENTRIES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!upstream.ok) {
        const errorText = await upstream.text();
        console.error(`Canny API error: ${upstream.status} - ${errorText}`);
        return { entries: [] };
      }

      const result = await upstream.json();
      return { result };
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

  // For client-side requests, use the API route (which has rate limiting)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = '/api/changelog';

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
