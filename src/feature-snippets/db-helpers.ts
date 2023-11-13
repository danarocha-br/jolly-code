import { toast } from "sonner";

import { Snippet, Collection } from "./dtos";
import { EditorState } from "@/app/store";
import { createUrl } from "@/components/ui/code-editor/helpers";

const headers = { "Content-Type": "application/json" };

type UpdateSnippetProps = {
  id: string;
  user_id: string | undefined;
  currentUrl?: string | undefined | null;
  title?: string;
  code?: string;
  language?: string;
  state?: EditorState;
};

type UpdateCollectionProps = {
  id: string;
  user_id: string | undefined;
  title?: string;
  snippets?: Snippet[];
};

type RemoveSnippetProps = {
  user_id: string | undefined;
  snippet_id: string | undefined;
};

/**
 * Creates a new collection.
 *
 * @param {Collection} collection - The collection object containing the title and user ID.
 * @return {Promise<{data: Collection} | undefined>} - A promise that resolves with the data of the created collection.
 */
export async function createCollection({
  title,
  user_id,
  snippets,
}: Omit<Collection, "id">): Promise<{ data: Collection } | undefined> {
  try {
    const sanitizedTitle =
      title === "" || title === undefined ? "Untitled" : title;

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

    if (!response.ok) {
      toast.error(`Failed to save the collection.`);
    } else {
      toast.success(`${sanitizedTitle} was created.`);
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
 * @return {Promise<Collection[]>} The fetched collections.
 */
export async function fetchCollections() {
  try {
    const response = await fetch("/api/collections", { method: "GET" });
    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data) {
      return [];
    }

    return data;
  } catch (error) {
    console.error("Network error:", error);
    toast.error("Cannot fetch collections. Please try again.");
    return [];
  }
}

/**
 * Fetches collections from the API by given ID.
 *
 * @return {Promise<Collection[]>} The fetched collections.
 */
export async function fetchCollectionById(
  id: string
): Promise<Collection[] | undefined> {
  if (!id) {
    throw new Error("Invalid id");
  }

  try {
    const params = new URLSearchParams();
    params.append("id", id);
    const url = `/api/collection?${params.toString()}`;

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (!data) {
      return;
    }

    return data;
  } catch (error) {
    console.error("Network error:", error);
    toast.error("Cannot fetch collections. Please try again.");
  }
}

/**
 * Removes a collection by sending a DELETE request to the API.
 *
 * @param {string} params.collection_id - The ID of the collection to be removed.
 * @param {string} params.user_id - The ID of the user making the request.
 * @returns {Promise<void>} A Promise that resolves when the collection is successfully deleted or rejects if there was an error.
 */
export const removeCollection = async ({
  collection_id,
  user_id,
}: {
  collection_id: string;
  user_id: string | undefined;
}): Promise<void> => {
  try {
    const url = "/api/collections";
    const options = {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        user_id,
        collection_id,
      }),
    };
    const response = await fetch(url, options);

    if (!response.ok) {
      toast.error(`Something went wrong, please try again.`);
    } else {
      toast.success("Collection deleted.");
    }
    await response.json();
  } catch (error) {
    toast.error(`Failed to delete collection.`);
  }
};

/**
 * Updates the title of a collection.
 * @param id - The ID of the collection to update.
 * @param user_id - The ID of the user who owns the collection.
 * @param title - The new title for the collection.
 * @returns The updated collection data.
 */
export const updateCollectionTitle = async ({
  id,
  user_id,
  title,
}: Omit<UpdateCollectionProps, "snippets">) => {
  try {
    const updateResponse = await fetch("/api/collections", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        id,
        user_id,
        title,
      }),
    });

    if (!updateResponse.ok) {
      return;
    }

    const { data } = await updateResponse.json();

    return { data };
  } catch (error) {
    toast.error("Something went wrong, please try again.");
  }
};

export const updateCollection = async ({
  id,
  user_id,
  title,
  snippet,
}: Omit<UpdateCollectionProps, "snippets"> & { snippet: Snippet }) => {
  try {
    const collectionResponse = await fetch(`/api/collection?id=${id}`);
    const { data: currentCollection } = await collectionResponse.json();

    // Check for null or if it's an array
    const currentSnippets =
      currentCollection?.snippets !== null &&
      Array.isArray(currentCollection?.snippets)
        ? currentCollection.snippets
        : [];

    const updatedSnippets = [...currentSnippets, snippet];

    //check if the snippet is already part of the array and if so, don't do anything

    const updateResponse = await fetch("/api/collections", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        id,
        user_id,
        title,
        snippets: updatedSnippets,
      }),
    });

    if (!updateResponse.ok) {
      return;
    } else {
      toast.success("Collection updated.");
    }
    const { data } = await updateResponse.json();

    return { data };
  } catch (error) {
    toast.error("Something went wrong, please try again.");
  }
};

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

export async function fetchSnippetById(id: string) {
  try {
    const response = await fetch(`/api/snippet/id=${id}`, { method: "GET" });
    if (!response.ok) {
      toast.error("Cannot fetch snippet. Please try again.");
    }
    const data = await response.json();

    if (!data) {
      toast.error("This snippet was not found. Please try again.");
    }

    return data;
  } catch (error) {
    console.error("Network error:", error);
    toast.error("Something went wrong. Please try again.");
  }
}

/**
 * Removes a snippet from the server.
 *
 * @param {RemoveSnippetProps} param - An object containing the user ID and the snippet ID.
 * @return {Promise<{ data: any }>} - A Promise that resolves to an object containing the response data.
 */
export async function removeSnippet({
  user_id,
  snippet_id,
}: RemoveSnippetProps) {
  try {
    const url = "/api/snippets";
    const options = {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        user_id,
        snippet_id,
      }),
    };
    const response = await fetch(url, options);

    if (!response.ok) {
      toast.error(`Something went wrong, please try again.`);
    } else {
      toast.success("Snippet unsaved.");
    }
    const data = await response.json();

    return { data };
  } catch (error) {
    toast.error(`Failed to remove the snippet.`);
  }
}

/**
 * Updates a snippet with the given properties.
 *
 * @param {object} props - The properties of the snippet to be updated.
 * @return {object} The updated snippet data.
 */
export async function updateSnippet({
  id,
  currentUrl,
  user_id,
  title,
  code,
  language,
  state,
}: UpdateSnippetProps) {
  let url = currentUrl;

  if (code && state) {
    url = createUrl(currentUrl, code, state, user_id);
  }

  try {
    const response = await fetch("/api/snippets", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        id,
        user_id,
        title,
        code,
        language,
        url,
      }),
    });

    if (!response.ok) {
      console.log(response);
      return;
    } else {
      toast.success("Snippet updated.");
    }
    const { data } = await response.json();

    return { data };
  } catch (error) {}
}
