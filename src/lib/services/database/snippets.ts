import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { Snippet } from "./types";

/**
 * Input type for updating a snippet in the database.
 * All fields except id and user_id are optional for partial updates.
 */
export type UpdateSnippetDbInput = {
    id: string;
    user_id: string;
    title?: string;
    code?: string;
    language?: string;
    url?: string | null;
    supabase: SupabaseClient<Database, "public", any>;
};

/**
 * Finds or creates a "Home" collection for the given user.
 *
 * @param {Object} params - The parameters for finding or creating the Home collection.
 * @param {string} params.user_id - The ID of the user.
 * @param {SupabaseClient<Database, "public", any>} params.supabase - The Supabase client instance.
 * @returns {Promise<string | undefined>} The collection ID if found or created, undefined if not found and creation failed, or throws on DB error.
 * @throws {Error} If a database error occurs during the select or insert operation.
 */
export async function getOrCreateHomeCollection({
    user_id,
    supabase,
}: {
    user_id: string;
    supabase: SupabaseClient<Database, "public", any>;
}): Promise<string | undefined> {
    // Check if a collection named "Home" exists for the user
    const { data: collections, error: collectionsError } = await supabase
        .from("collection")
        .select("id")
        .eq("user_id", user_id)
        .eq("title", "Home");

    if (collectionsError) {
        throw collectionsError;
    }

    // If the collection exists, return its ID
    if (collections && collections.length > 0) {
        return collections[0].id;
    }

    // If the collection does not exist, create one
    const { data: newCollection, error: createError } = await supabase
        .from("collection")
        .insert([
            {
                user_id,
                title: "Home",
                updated_at: new Date().toISOString(),
            },
        ])
        .select("id")
        .single();

    if (createError) {
        throw createError;
    }

    return newCollection?.id;
}

/**
 * Inserts a snippet into the database.
 *
 * @param {Snippet} snippet - The snippet object containing the user ID, title, code, language, and URL.
 * @throws {Error} If any of the required input parameters are missing.
 * @return {Promise<any>} The result of the insert operation.
 */
export async function insertSnippet({
    id,
    user_id,
    title,
    code,
    language,
    url,
    supabase,
}: Snippet): Promise<any> {
    let sanitizedTitle = null;

    if (title === "" || title === undefined) {
        sanitizedTitle = "Untitled";
    } else {
        sanitizedTitle = title;
    }

    // Create the snippet

    try {
        const { data: snippet, error } = await supabase
            .from("snippet")
            .insert([
                {
                    id,
                    user_id,
                    title: sanitizedTitle,
                    code,
                    language,
                    url,
                    updated_at: new Date().toISOString(),
                },
            ])
            .select();

        if (snippet) {
            // Get or create the "Home" collection for the user
            const collectionId = await getOrCreateHomeCollection({
                user_id,
                supabase,
            });

            // Add snippet to "Home" collection via junction table
            if (collectionId) {
                // Check if the snippet is already in the collection
                const { data: existingJunction, error: checkError } = await supabase
                    .from("collection_snippets")
                    .select("snippet_id")
                    .eq("collection_id", collectionId)
                    .eq("snippet_id", snippet[0].id)
                    .maybeSingle();

                if (checkError) {
                    throw checkError;
                }

                // Only insert if not already in collection
                if (existingJunction === null) {
                    const { error: insertJunctionError } = await supabase
                        .from("collection_snippets")
                        .insert([
                            {
                                collection_id: collectionId,
                                snippet_id: snippet[0].id,
                            },
                        ]);

                    if (insertJunctionError) {
                        console.error(insertJunctionError);
                        throw insertJunctionError;
                    }
                }
            }

            return snippet;
        }
    } catch (error) {
        console.error(error);
        throw new Error("An error occurred. Please try again later.");
    }
}

/**
 * Deletes a snippet.
 *
 * @param {user_id, id} The snippet to be deleted.
 * @return {Promise<void>} - A promise that resolves when the snippet is successfully deleted.
 */
export async function deleteSnippet({
    snippet_id,
    user_id,
    supabase,
}: {
    snippet_id: string;
    user_id: string;
    supabase: SupabaseClient<Database, "public", any>;
}): Promise<void> {
    try {
        // Delete the snippet (CASCADE will automatically delete junction records)
        const { error: deleteError } = await supabase
            .from("snippet")
            .delete()
            .eq("id", snippet_id)
            .eq("user_id", user_id);

        if (deleteError) {
            throw deleteError;
        }
    } catch (error) {
        console.error(error);
        throw new Error("An error occurred. Please try again later.");
    }
}

/**
 * Retrieves a snippet by its ID from the database.
 * @param user_id - The ID of the user who owns the snippet.
 * @param snippet_id - The ID of the snippet.
 * @param supabase - The Supabase client instance.
 * @returns A promise that resolves to an array of snippets.
 * @throws If the snippet is not found or an error occurs.
 */
export async function getSnippetById({
    user_id,
    snippet_id,
    supabase,
}: {
    user_id: string;
    snippet_id: string;
    supabase: SupabaseClient<Database, "public", any>;
}): Promise<Snippet[]> {
    try {
        const { data } = await supabase
            .from("snippet")
            .select()
            .eq("id", snippet_id)
            .eq("user_id", user_id);

        if (data && data.length > 0) {
            return data;
        } else {
            throw new Error("Snippet not found.");
        }
    } catch (error) {
        console.error(error);
        return Promise.reject(
            new Error("An error occurred. Please try again later.")
        );
    }
}

/**
 * Retrieves a list of snippets for a specific user.
 *
 * @param {string} user_id - The ID of the user.
 * @param {SupabaseClient<Database, "public", any>} supabase - The Supabase client.
 * @return {Promise<Snippet[]>} - A promise that resolves to an array of snippets.
 */
export async function getUsersSnippetsList({
    user_id,
    supabase,
}: {
    user_id: string;
    supabase: SupabaseClient<Database, "public", any>;
}): Promise<Snippet[]> {
    try {
        const { data } = await supabase
            .from("snippet")
            .select("*")
            .eq("user_id", user_id);

        if (data) {
            return data;
        } else {
            throw new Error("No snippets found.");
        }
    } catch (error) {
        console.error(error);
        return Promise.reject(
            new Error("An error occurred. Please try again later.")
        );
    }
}

/**
 * Updates a snippet in the database.
 *
 * @param {UpdateSnippetDbInput} input - The snippet update input containing id, user_id, and optional fields to update.
 * @return {Promise<Snippet[]>} - A promise that resolves to the updated snippet data.
 */
export async function updateSnippet({
    id,
    user_id,
    title,
    code,
    language,
    url,
    supabase,
}: UpdateSnippetDbInput): Promise<Snippet[]> {
    // Build update object with only provided fields
    const updateData: {
        title?: string;
        code?: string;
        language?: string;
        url?: string | null;
        updated_at: string;
    } = {
        updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided (not undefined)
    if (title !== undefined) {
        updateData.title = title === "" ? "Untitled" : title;
    }
    if (code !== undefined) {
        updateData.code = code;
    }
    if (language !== undefined) {
        updateData.language = language;
    }
    if (url !== undefined) {
        updateData.url = url;
    }

    try {
        const { data, error } = await supabase
            .from("snippet")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user_id)
            .select();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error(error);
        throw new Error("An error occurred. Please try again later.");
    }
}
