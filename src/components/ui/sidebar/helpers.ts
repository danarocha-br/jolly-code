import { toast } from "sonner";
import { SnippetData } from "../code-editor/editor";

const headers = { "Content-Type": "application/json" };

type Collection = {
  user_id: string;
  title: string;
  snippets?: SnippetData[];
};

/**
 * Creates a new collection.
 *
 * @param {Collection} collection - The collection object containing the title and user ID.
 * @return {Promise<{data: unknown}>} - A promise that resolves with the data of the created collection.
 */
export async function createCollection({
  title,
  user_id,
  snippets,
}: Collection) {
  try {
    let sanitizedTitle = null;

    if (title === "" || title === undefined) {
      sanitizedTitle = "Untitled";
    } else {
      sanitizedTitle = title;
    }

    if (!user_id) {
      toast.error(`You must be authenticated to create a collection.`);
    }

    const response = await fetch("/api/collections", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id,
        title: sanitizedTitle,
        snippets,
      }),
    });

    console.log(response);

    if (!response.ok) {
      toast.error(`Failed to save the collection.`);
    } else {
      toast.success(`${sanitizedTitle} is created.`);
    }
    const { data } = await response.json();

    return { data };
  } catch (error) {
    toast.error(`Failed to save the collection.`);
  }
}

/**
 * Fetches collections from the API.
 *
 * @return {Promise<any>} The fetched data.
 */
export async function fetchCollections() {
  try {
    const response = await fetch("/api/collections", { method: "GET" });
    if (!response.ok) {
      toast.error("Cannot fetch collections. Please try again.");
    }
    const data = await response.json();

    if (!data) {
      toast.error("Cannot fetch collections. Please try again.");
    }

    return data;
  } catch (error) {
    console.error("Network error:", error);
    toast.error("Cannot fetch collections. Please try again.");
  }
}

/**
 * Fetches snippets from the server.
 *
 * @return {Promise<any>} The fetched snippets.
 */
export async function fetchSnippets() {
  try {
    const response = await fetch("/api/snippets", { method: "GET" });
    if (!response.ok) {
      toast.error("Cannot fetch snippets. Please try again.");
    }
    const data = await response.json();

    if (!data) {
      toast.error("Cannot fetch snippets. Please try again.");
    }

    return data;
  } catch (error) {
    console.error("Network error:", error);
    toast.error("Cannot fetch snippets. Please try again.");
  }
}
