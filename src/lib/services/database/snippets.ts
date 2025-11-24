import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { Snippet } from "./types";

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
            // Check if a collection named "Home" exists for the user
            let { data: collections }: { data: any[] | null; error: any } =
                await supabase
                    .from("collection")
                    .select("id")
                    .eq("user_id", user_id)
                    .eq("title", "Home");

            let collectionId: string | undefined;

            // If the collection does not exist, create one
            if (!collections || collections.length === 0) {
                const { data: newCollection }: { data: any[] | null; error: any } =
                    await supabase.from("collection").insert([
                        {
                            user_id,
                            snippets: [snippet[0].id],
                            title: "Home",
                            updated_at: new Date().toISOString(),
                        },
                    ]);

                //@ts-ignore
                if (newCollection && newCollection.length > 0) {
                    //@ts-ignore
                    collectionId = newCollection[0].id;
                }
            } else if (collections && collections.length > 0) {
                collectionId = collections[0].id;

                // Fetch the current collection
                const { data: currentCollection, error: currentCollectionError } =
                    await supabase
                        .from("collection")
                        .select("snippets")
                        .eq("user_id", user_id)
                        .eq("id", collectionId)
                        .single();

                if (currentCollectionError) {
                    throw currentCollectionError;
                }

                // Check if the snippet id already exists in the collection
                if (!currentCollection.snippets.includes(snippet[0].id)) {
                    // Append the new snippet to the existing snippets array
                    const updatedSnippets = [
                        ...currentCollection.snippets,
                        snippet[0].id,
                    ];
                    // Update the collection with the new snippets array
                    const { error: updateError } = await supabase
                        .from("collection")
                        .update({ snippets: updatedSnippets, updated_at: new Date().toISOString() })
                        .eq("user_id", user_id)
                        .eq("id", collectionId);

                    if (updateError) {
                        console.log(updateError);
                        throw updateError;
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
        // Find collections that contain the snippet
        const { data: collections, error: collectionError } = await supabase
            .from("collection")
            .select("*")
            .eq("user_id", user_id);

        if (collectionError) {
            throw collectionError;
        }

        // Remove the snippet from each collection
        if (collections) {
            for (const collection of collections) {
                if (collection.snippets) {
                    const updatedSnippets = collection.snippets.filter(
                        (id: string) => id !== snippet_id
                    );

                    const { error: updateError } = await supabase
                        .from("collection")
                        .update({ snippets: updatedSnippets })
                        .eq("id", collection.id)
                        .eq("user_id", user_id);

                    if (updateError) {
                        throw updateError;
                    }
                }
            }
        }

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
            return data[0];
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
 * @param {Snippet} snippet - The snippet object containing the snippet information.
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
}: Snippet): Promise<Snippet[]> {
    let sanitizedTitle = null;

    if (title === "" || title === undefined) {
        sanitizedTitle = "Untitled";
    } else {
        sanitizedTitle = title;
    }

    try {
        const { data, error } = await supabase
            .from("snippet")
            .update([
                {
                    user_id,
                    title: sanitizedTitle,
                    code,
                    language,
                    url,
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
