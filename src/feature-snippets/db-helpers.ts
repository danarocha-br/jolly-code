import { toast } from "sonner";

import { Snippet, Collection } from "./dtos";
import { EditorState } from "@/app/store";

const headers = { "Content-Type": "application/json" };

export type UpdateSnippetProps = {
  id: string;
  user_id: string | undefined;
  currentUrl?: string | undefined | null;
  title?: string;
  code?: string;
  language?: string;
  state?: EditorState;
};

export type UpdateCollectionProps = {
  id: string;
  user_id: string | undefined;
  title?: string;
  snippets?: Snippet[];
};

export type RemoveSnippetProps = {
  user_id: string | undefined;
  snippet_id: string | undefined;
};

export type CreateSnippetProps = {
  id: string;
  user_id: string | undefined;
  currentUrl: string | undefined | null;
  title?: string;
  code: string;
  language: string;
  state: EditorState;
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
}: Omit<UpdateCollectionProps, "snippets">): Promise<
  { data: Collection } | undefined
> => {
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

export const removeSnippetFromPreviousCollection = async (
  user_id: string | undefined,
  snippet_id: string,
  previous_collection_id: string
): Promise<void> => {
  try {
    const collectionResponse = await fetch(
      `/api/collection?id=${previous_collection_id}`
    );
    const { data: currentCollection } = await collectionResponse.json();

    // Check for null or if it's an array
    const currentSnippets =
      currentCollection?.snippets !== null &&
      Array.isArray(currentCollection?.snippets)
        ? currentCollection.snippets
        : [];

    // Check if snippet_id exists in currentSnippets and remove it
    if (currentSnippets.includes(snippet_id)) {
      const updatedSnippets = currentSnippets.filter(
        (id: string) => id !== snippet_id
      );

      const updateResponse = await fetch("/api/collections", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: previous_collection_id,
          snippets: updatedSnippets,
          user_id,
        }),
      });

      if (!updateResponse.ok) {
        toast.error("Something went wrong, please try again.");
      } else {
        return;
      }
    }
  } catch (error) {
    toast.error("Something went wrong, please try again.");
  }
};

/**
 * Updates a collection with a new snippet.
 *
 * @param id - The ID of the collection to update.
 * @param user_id - The ID of the user who owns the collection.
 * @param title - The new title of the collection.
 * @param snippet - The new snippet to add to the collection.
 * @returns The updated collection data.
 */
export const updateCollection = async ({
  id,
  previous_collection_id,
  user_id,
  title,
  snippet_id,
}: Omit<UpdateCollectionProps, "snippets"> & {
  snippet_id: string;
  previous_collection_id: string;
}): Promise<Collection | undefined> => {
  try {
    // Remove snippet from the previous collection
    await removeSnippetFromPreviousCollection(
      user_id,
      snippet_id,
      previous_collection_id
    );

    const collectionResponse = await fetch(`/api/collection?id=${id}`);
    const { data: currentCollection } = await collectionResponse.json();

    // Check for null or if it's an array
    const currentSnippets =
      currentCollection?.snippets !== null &&
      Array.isArray(currentCollection?.snippets)
        ? currentCollection.snippets
        : [];

    // Check if snippet_id already exists in currentSnippets
    if (!currentSnippets.includes(snippet_id)) {
      const updatedSnippets = [...currentSnippets, snippet_id];

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
      }
      const { data } = await updateResponse.json();

      return data;
    } else {
      toast.error("This snippet already belongs to this collection.");
    }
  } catch (error) {
    toast.error("Something went wrong, please try again.");
  }
};

/**
 * Generates a URL with query parameters based on the current URL, code, state, and user ID.
 *
 * @return {string} The generated URL with query parameters.
 */
export function createUrl(
  currentUrl: string | null | undefined,
  code: string,
  state: EditorState,
  user_id: string | undefined
) {
  const queryParams = new URLSearchParams();

  const stringifiedState = transformState(state);

  queryParams.append("code", encodeURIComponent(code));
  queryParams.append("user_id", user_id ?? "");

  Object.entries(stringifiedState).forEach(([key, value]) => {
    queryParams.append(key, value);
  });

  queryParams.delete("shared");

  return `${currentUrl}?${queryParams.toString()}`;
}

/**
 * Transforms the given EditorState object into a new object by converting all
 * nested objects into string representations.
 *
 * @param {EditorState} state - The EditorState object to transform.
 * @return {Object} The transformed object.
 */
export function transformState(state: EditorState) {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        return [key, JSON.stringify(value)];
      } else {
        return [key, String(value)];
      }
    })
  );
}

/**
 * Create a new snippet.
 *
 * @param {CreateSnippetProps} snippetProps - The snippet properties.
 * @returns {Promise<{ data: Snippet }| undefined>} - The created snippet data or undefined.
 */
export async function createSnippet({
  id,
  currentUrl,
  user_id,
  title,
  code,
  language,
  state,
}: CreateSnippetProps): Promise<{ data: Snippet } | undefined> {
  try {
    const url = createUrl(currentUrl, code, state, user_id);

    const response = await fetch("/api/snippets", {
      method: "POST",
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
      toast.error(`Failed to save the snippet.`);
    } else {
      toast.success("Your code snippet was saved.", {
        action: {
          label: "Choose folder",
          onClick: () => console.log("Action!"),
        },
      });
    }
    const { data } = await response.json();

    return { data };
  } catch (error) {
    console.log(error);
    toast.error(`Failed to save the snippet.`);
  }
}

/**
 * Fetches snippets from the API.
 * @returns A promise that resolves to an array of Snippet objects, or undefined if there was an error.
 */
export async function fetchSnippets(): Promise<Snippet[] | undefined> {
  try {
    const response = await fetch("/api/snippets", { method: "GET" });
    if (!response.ok) {
      toast.error("Cannot fetch snippets. Please try again.");
    }
    const data = await response.json();

    if (!data) {
      return;
    }

    return data;
  } catch (error) {
    console.error("Network error:", error);
    toast.error("Cannot fetch snippets. Please try again.");
  }
}

/**
 * Fetches a snippet by its ID from the API.
 * @param {string} id - The ID of the snippet.
 * @returns {Promise<Snippet>} - A promise that resolves to the snippet data.
 */
export async function fetchSnippetById(
  id: string
): Promise<Snippet | undefined> {
  try {
    const response = await fetch(`/api/snippet?id=${id}`, { method: "GET" });

    const { data } = await response.json();

    if (!data) {
      return;
    }

    return data;
  } catch (error) {
    console.error("Network error:", error);
    toast.error("Something went wrong. Please try again.");
  }
}

/**
 * Removes a snippet from the API.
 *
 * @param {RemoveSnippetProps} params - The parameters for removing the snippet.
 * @returns {Promise<void>} A Promise that resolves when the snippet is successfully deleted or rejects if there was an error.
 */
export async function removeSnippet({
  snippet_id,
  user_id,
}: RemoveSnippetProps): Promise<void> {
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
      toast.success("Snippet was removed.");
    }
    await response.json();
  } catch (error) {
    toast.error(`Failed to remove the snippet.`);
  }
}

/**
 * Update a snippet in the API.
 *
 * @param id - The ID of the snippet to update.
 * @param currentUrl - The current URL.
 * @param user_id - The user ID.
 * @param title - The new title of the snippet.
 * @param code - The new code of the snippet.
 * @param language - The new language of the snippet.
 * @param state - The new state of the snippet.
 * @returns A promise that resolves to an object containing the updated snippet data, or undefined if the update fails.
 */
export async function updateSnippet({
  id,
  currentUrl,
  user_id,
  title,
  code,
  language,
  state,
}: UpdateSnippetProps): Promise<{ data: Snippet } | undefined> {
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
      return;
    }

    const { data } = await response.json();

    return { data };
  } catch (error) {
    toast.error(`Failed to update the ${title}.`);
  }
}
