import { toast } from "sonner";

import { Snippet, Collection } from "./dtos";
import { EditorState } from "@/app/store";
import {
  getSnippets,
  getSnippetById,
  createSnippet as createSnippetAction,
  updateSnippet as updateSnippetAction,
  deleteSnippet,
  getCollections,
  getCollectionById,
  createCollection as createCollectionAction,
  updateCollection as updateCollectionAction,
  deleteCollection,
} from "@/actions";
import type { UsageLimitCheck } from "@/lib/services/usage-limits";
import type { ActionResult } from "@/actions/utils/action-result";



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

export type CreateSnippetResponse = {
  data: Snippet;
  usage?: UsageLimitCheck;
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
      return undefined;
    }

    const result = await createCollectionAction({
      title: sanitizedTitle,
      snippets: snippets as any,
    });

    if (result.error) {
      toast.error(result.error);
      return undefined;
    }

    return { data: result.data! };
  } catch (error) {
    toast.error(`Failed to save the collection.`);
    return undefined;
  }
}

/**
 * Fetches collections from the API.
 *
 * @return {Promise<Collection[]>} The fetched collections.
 * @throws {Error} - Throws an error if collections cannot be fetched.
 */
export async function fetchCollections(): Promise<Collection[]> {
  try {
    const result = await getCollections();

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("No collections found");
    }

    return result.data;
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Cannot fetch collections. Please try again.";
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Fetches collections from the API by given ID.
 *
 * @return {Promise<Collection[]>} The fetched collections.
 * @throws {Error} - Throws an error if the collection cannot be fetched.
 */
export async function fetchCollectionById(
  id: string
): Promise<Collection[]> {
  if (!id) {
    throw new Error("Invalid id");
  }

  try {
    const result = await getCollectionById(id);

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("Collection not found");
    }

    // Return as array for backwards compatibility
    return [result.data];
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Cannot fetch collections. Please try again.";
    toast.error(errorMessage);
    throw error;
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
    const result = await deleteCollection(collection_id);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Success - no toast needed as it's handled by the caller
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
    const result = await updateCollectionAction({
      id,
      title,
    });

    if (result.error) {
      toast.error(result.error);
      return undefined;
    }

    return { data: result.data! };
  } catch (error) {
    toast.error("Something went wrong, please try again.");
    return undefined;
  }
};

export const removeSnippetFromPreviousCollection = async (
  user_id: string | undefined,
  snippet_id: string,
  previous_collection_id: string
): Promise<void> => {
  try {
    const collectionResult = await getCollectionById(previous_collection_id);

    if (collectionResult.error || !collectionResult.data) {
      return;
    }

    const currentCollection = collectionResult.data;

    // Check for null or if it's an array
    const currentSnippets =
      currentCollection?.snippets !== null &&
        Array.isArray(currentCollection?.snippets)
        ? currentCollection.snippets
        : [];

    // Check if snippet_id exists in currentSnippets and remove it
    if (currentSnippets.some((s) => s.id === snippet_id)) {
      const updatedSnippets = currentSnippets.filter(
        (s) => s.id !== snippet_id
      );

      const result = await updateCollectionAction({
        id: previous_collection_id,
        snippets: updatedSnippets.map((s) => s.id) as any,
      });

      if (result.error) {
        toast.error("Something went wrong, please try again.");
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

    const collectionResult = await getCollectionById(id);

    if (collectionResult.error || !collectionResult.data) {
      toast.error("Failed to fetch collection");
      return undefined;
    }

    const currentCollection = collectionResult.data;

    // Check for null or if it's an array
    const currentSnippets =
      currentCollection?.snippets !== null &&
        Array.isArray(currentCollection?.snippets)
        ? currentCollection.snippets
        : [];

    // Check if snippet_id already exists in currentSnippets
    if (!currentSnippets.some((s) => s.id === snippet_id)) {
      // We need to fetch the snippet to add it to the collection locally if we want to return the full object
      // But updateCollectionAction likely expects IDs.
      // And we need to return the updated collection with Snippet objects.

      // Fetch the snippet first
      const snippetResult = await getSnippetById(snippet_id);
      if (snippetResult.error || !snippetResult.data) {
        toast.error("Failed to fetch snippet details");
        return undefined;
      }
      const snippet = snippetResult.data;

      const updatedSnippets = [...currentSnippets, snippet];

      const result = await updateCollectionAction({
        id,
        title,
        snippets: updatedSnippets.map(s => s.id) as any,
      });

      if (result.error) {
        toast.error(result.error);
        return undefined;
      }

      return { ...result.data!, snippets: updatedSnippets };
    } else {
      toast.error("This snippet already belongs to this collection.");
      return undefined;
    }
  } catch (error) {
    toast.error("Something went wrong, please try again.");
    return undefined;
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
 * @returns {Promise<ActionResult<Snippet>>} - The action result with snippet data or error.
 */
export async function createSnippet({
  id,
  currentUrl,
  user_id,
  title,
  code,
  language,
  state,
}: CreateSnippetProps): Promise<ActionResult<Snippet>> {
  try {
    const url = createUrl(currentUrl, code, state, user_id);

    const result = await createSnippetAction({
      id,
      title,
      code,
      language,
      url,
    });

    if (result.error) {
      return result;
    }

    const snippet = result.data;

    if (snippet) {
      toast.success("Your code snippet was saved.");
      return { data: snippet };
    }

    return { error: "Failed to create snippet" };
  } catch (error) {
    console.log(error);
    return { error: "Failed to save the snippet." };
  }
}

/**
 * Fetches snippets from the API.
 * @returns A promise that resolves to an array of Snippet objects.
 * @throws {Error} - Throws an error if snippets cannot be fetched.
 */
export async function fetchSnippets(): Promise<Snippet[]> {
  try {
    const result = await getSnippets();

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("No snippets found");
    }

    return result.data;
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Cannot fetch snippets. Please try again.";
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Fetches a snippet by its ID from the API.
 * @param {string} id - The ID of the snippet.
 * @returns {Promise<Snippet>} - A promise that resolves to the snippet data.
 * @throws {Error} - Throws an error if the snippet cannot be fetched.
 */
export async function fetchSnippetById(
  id: string
): Promise<Snippet> {
  try {
    const result = await getSnippetById(id);

    if (result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    if (!result.data) {
      throw new Error("Snippet not found");
    }

    return result.data;
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    toast.error(errorMessage);
    throw error;
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
    if (!snippet_id) {
      toast.error("Snippet ID is missing.");
      return;
    }

    const result = await deleteSnippet(snippet_id);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Snippet was removed.");
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
    const result = await updateSnippetAction({
      id,
      title,
      code,
      language,
      url: url ?? undefined,
    });

    if (result.error) {
      toast.error(result.error);
      return undefined;
    }

    return { data: result.data! };
  } catch (error) {
    toast.error(`Failed to update the ${title}.`);
    return undefined;
  }
}
