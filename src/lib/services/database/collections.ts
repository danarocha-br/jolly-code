import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { Collection, Snippet } from "./types";

/**
 * Inserts a new collection into the database.
 *
 * @param {Collection} collection - The collection object containing the user ID, title, snippets, and Supabase instance.
 * @return {Promise<Collection>} - A promise that resolves to the inserted data or throws an error.
 */
export async function insertCollection({
    user_id,
    title,
    snippets,
    supabase,
}: Collection): Promise<Collection[]> {
    try {
        const { data, error } = await supabase
            .from("collection")
            .insert([
                {
                    user_id,
                    title,
                    snippets,
                    updated_at: new Date().toISOString(),
                },
            ])
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

/**
 * Updates a collection in the database.
 *
 * @param {Collection} collection - The collection object containing the following properties:
 * @return {Promise<any>} A promise that resolves with the updated collection data.
 */
export async function updateCollection({
    id,
    user_id,
    title,
    snippets,
    supabase,
}: Collection): Promise<any> {
    try {
        const { data, error } = await supabase
            .from("collection")
            .update([
                {
                    user_id,
                    title,
                    snippets,
                    updated_at: new Date().toISOString(),
                },
            ])
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

/**
 * Deletes a collection from the database.
 * @param {string} collection_id - The ID of the collection to delete.
 * @param {string} user_id - The ID of the user who owns the collection.
 * @param {SupabaseClient<Database, "public", any>} supabase - The Supabase client.
 * @throws {Error} If an error occurs while deleting the collection.
 */
export async function deleteCollection({
    collection_id,
    user_id,
    supabase,
}: {
    collection_id: string;
    user_id: string;
    supabase: SupabaseClient<Database, "public", any>;
}): Promise<void> {
    try {
        // Fetch the collection
        const { data: collection, error: fetchError } = await supabase
            .from("collection")
            .select("snippets")
            .eq("id", collection_id)
            .eq("user_id", user_id)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        // Delete all snippets that belong to the collection
        if (collection && collection.snippets) {
            for (const snippet_id of collection.snippets) {
                const { error: deleteSnippetError } = await supabase
                    .from("snippet")
                    .delete()
                    .eq("id", snippet_id)
                    .eq("user_id", user_id);

                if (deleteSnippetError) {
                    throw deleteSnippetError;
                }
            }
        }

        // Delete the collection
        const { error: deleteError } = await supabase
            .from("collection")
            .delete()
            .eq("id", collection_id)
            .eq("user_id", user_id);

        if (deleteError) {
            throw new Error(
                deleteError.message ||
                "An error occurred while deleting the collection."
            );
        }
    } catch (error) {
        throw new Error("An error occurred. Please try again later.");
    }
}

/**
 * Retrieves a list of user collections from the database.
 *
 * @param {Object} params - The parameters for retrieving the collection list.
 * @return {Promise<Snippet[]>} A promise that resolves to an array of Snippet objects representing the user's collections.
 */
export async function getUsersCollectionList({
    user_id,
    supabase,
}: {
    user_id: string;
    supabase: SupabaseClient<Database, "public", any>;
}): Promise<Snippet[]> {
    try {
        const { data } = await supabase
            .from("collection")
            .select("*")
            .eq("user_id", user_id);

        if (data) {
            // Sort the data to ensure the collection titled "Home" is always first
            const sortedData = data.sort((a, b) => {
                if (a.title === "Home") return -1;
                if (b.title === "Home") return 1;
                return 0;
            });

            return sortedData;
        } else {
            throw new Error("No collections found.");
        }
    } catch (error) {
        console.error('Error in getUsersCollectionList:', error);
        throw error;
    }
}

/**
 * Retrieves a user collection by ID from the Supabase database.
 *
 * @param {object} params - The parameters for retrieving the user collection.
 * @param {SupabaseClient<Database, "public", any>} params.supabase - The Supabase client.
 * @returns {Promise<Collection>} The retrieved user collection.
 * @throws {Error} If an error occurs during retrieval.
 */
export async function getUserCollectionById({
    id,
    user_id,
    supabase,
}: {
    id: string;
    user_id: string;
    supabase: SupabaseClient<Database, "public", any>;
}): Promise<Collection> {
    try {
        const { data } = await supabase
            .from("collection")
            .select("*")
            .eq("user_id", user_id)
            .eq("id", id);

        if (data && data.length > 0) {
            return data[0] as Collection;
        } else {
            throw new Error("No collection found.");
        }
    } catch (error) {
        console.error(error);
        return Promise.reject(
            new Error("An error occurred. Please try again later.")
        );
    }
}
