import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/types/database";
import { Collection, Snippet } from "./types";

/**
 * Extracts snippet IDs from an array that may contain Snippet objects or string IDs.
 * 
 * @param snippets - Array of Snippet objects or string IDs
 * @returns Array of string IDs with falsy values filtered out
 */
function extractSnippetIds(snippets: (Snippet | string)[]): string[] {
	return snippets
		.map((s) => (typeof s === 'string' ? s : s.id))
		.filter((id): id is string => Boolean(id));
}

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
	let collectionId: string | null = null;
	let collectionCreated = false;
	let cleanupAttempted = false;

	const cleanupCollection = async (): Promise<void> => {
		if (cleanupAttempted || !collectionCreated || !collectionId) {
			return;
		}
		cleanupAttempted = true;

		try {
			const { error: cleanupError } = await supabase
				.from("collection")
				.delete()
				.eq("id", collectionId)
				.eq("user_id", user_id);

			if (cleanupError) {
				console.error(
					`[insertCollection] Failed to cleanup orphaned collection ${collectionId}:`,
					cleanupError
				);
			} else {
				console.log(
					`[insertCollection] Successfully cleaned up orphaned collection ${collectionId}`
				);
			}
		} catch (cleanupErr) {
			console.error(
				`[insertCollection] Exception during cleanup of orphaned collection ${collectionId}:`,
				cleanupErr
			);
		}
	};

	try {
		// Insert the collection (without snippets column - using junction table now)
		const { data, error } = await supabase
			.from("collection")
			.insert([
				{
					user_id,
					title,
					updated_at: new Date().toISOString(),
				},
			])
			.select();

		if (error) {
			throw error;
		}

		if (!data || data.length === 0) {
			throw new Error("Failed to create collection");
		}

		collectionId = data[0].id;
		collectionCreated = true;

		// Insert junction records for snippets if provided
		if (snippets && Array.isArray(snippets) && snippets.length > 0) {
			// Extract snippet IDs (handle both Snippet objects and string IDs)
			const snippetIds = extractSnippetIds(snippets);

			if (snippetIds.length > 0) {
				const junctionRecords = snippetIds.map((snippetId: string) => ({
					collection_id: collectionId,
					snippet_id: snippetId,
				}));

				const { error: junctionError } = await supabase
					.from("collection_snippets")
					.insert(junctionRecords);

				if (junctionError) {
					// Junction insert failed - clean up the orphaned collection
					await cleanupCollection();
					// Re-throw the original junction error
					throw junctionError;
				}
			}
		}

		return data;
	} catch (error) {
		// If collection was created but we're throwing an error, attempt cleanup
		// (this handles edge cases where error occurs after collection creation but before junction insert)
		await cleanupCollection();

		// Propagate the original error with its message preserved
		console.error("[insertCollection] Error creating collection:", error);
		if (error instanceof Error) {
			throw error;
		}
		// For non-Error objects (e.g., Supabase PostgrestError), wrap but preserve message
		const errorMessage = typeof error === 'object' && error !== null && 'message' in error
			? String(error.message)
			: "An error occurred. Please try again later.";
		throw new Error(errorMessage);
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
		// Update collection metadata (title, etc.)
		const updateData: any = {
			updated_at: new Date().toISOString(),
		};

		const trimmedTitle = typeof title === 'string' ? title.trim() : title;
		if (trimmedTitle !== undefined && trimmedTitle !== null && trimmedTitle !== '') {
			updateData.title = trimmedTitle;
		}

		const { data, error } = await supabase
			.from("collection")
			.update(updateData)
			.eq("id", id)
			.eq("user_id", user_id)
			.select();

		if (error) {
			throw error;
		}

		// Update junction table if snippets are provided
		if (snippets !== undefined) {
			// Delete existing junction records
			const { error: deleteError } = await supabase
				.from("collection_snippets")
				.delete()
				.eq("collection_id", id);

			if (deleteError) {
				throw deleteError;
			}

			// Insert new junction records if snippets array is provided and not empty
			if (Array.isArray(snippets) && snippets.length > 0) {
				// Extract snippet IDs (handle both Snippet objects and string IDs)
				const snippetIds = extractSnippetIds(snippets);

				if (snippetIds.length > 0) {
					const junctionRecords = snippetIds.map((snippetId: string) => ({
						collection_id: id,
						snippet_id: snippetId,
					}));

					const { error: insertError } = await supabase
						.from("collection_snippets")
						.insert(junctionRecords);

					if (insertError) {
						throw insertError;
					}
				}
			}

			// Refetch the collection with snippets populated if snippets were updated
			if (data && data.length > 0 && id) {
				const fullCollection = await getUserCollectionById({
					id,
					user_id,
					supabase
				});

				console.error('[updateCollectionInDb] Refetched collection after snippet update:', {
					id: fullCollection.id,
					title: fullCollection.title,
					hasTitle: !!fullCollection.title,
					titleLength: fullCollection.title?.length
				});

				// Ensure title is preserved - if refetch returned null, log warning
				if (!fullCollection.title || fullCollection.title.trim() === '') {
					console.error('[updateCollectionInDb] ERROR: Refetched collection has null/empty title!', {
						id: fullCollection.id,
						originalUpdateDataTitle: updateData.title,
						wasTitleInUpdate: 'title' in updateData
					});
				}

				return [fullCollection];
			}
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
		// Verify the collection exists and belongs to the user
		const { data: collection, error: fetchError } = await supabase
			.from("collection")
			.select("id")
			.eq("id", collection_id)
			.eq("user_id", user_id)
			.single();

		if (fetchError) {
			throw fetchError;
		}

		if (!collection) {
			throw new Error("Collection not found");
		}

		// Delete the collection (CASCADE will automatically delete junction records)
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
 * @return {Promise<Collection[]>} A promise that resolves to an array of Collection objects representing the user's collections.
 */
export async function getUsersCollectionList({
	user_id,
	supabase,
}: {
	user_id: string;
	supabase: SupabaseClient<Database, "public", any>;
}): Promise<Collection[]> {
	try {
		const { data, error } = await supabase
			.from("collection")
			.select(`
                *,
                collection_snippets (
                    snippet_id,
                    snippet (
                        id,
                        user_id,
                        title,
                        code,
                        language,
                        url,
                        created_at,
                        updated_at
                    )
                )
            `)
			.eq("user_id", user_id)
			.order("created_at", { ascending: true });

		if (error) {
			throw error;
		}

		if (data) {
			// Transform the data to match the expected format
			const transformedData = data.map((collection: any) => {
				// Extract snippets from the junction table join
				const snippets = collection.collection_snippets
					?.map((cs: any) => cs.snippet)
					.filter((s: any) => s !== null) || [];

				// Ensure title is never null/empty - defensive check
				// If title is missing, keep it as-is (may be null, but we don't want to corrupt data)
				// The UI layer should handle displaying "Untitled" for null/empty titles
				const safeTitle = collection.title?.trim() || collection.title;

				return {
					...collection,
					title: safeTitle,
					snippets: snippets,
				};
			});

			// Sort the data to ensure the collection titled "Home" is always first
			const sortedData = transformedData.sort((a, b) => {
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
		const { data, error } = await supabase
			.from("collection")
			.select(`
                *,
                collection_snippets (
                    snippet_id,
                    snippet (
                        id,
                        user_id,
                        title,
                        code,
                        language,
                        url,
                        created_at,
                        updated_at
                    )
                )
            `)
			.eq("user_id", user_id)
			.eq("id", id)
			.single();

		if (error) {
			throw error;
		}

		if (data) {
			// Extract snippets from the junction table join
			const snippets = data.collection_snippets
				?.map((cs: any) => cs.snippet)
				.filter((s: any) => s !== null) || [];

			// Ensure title is preserved - if it's null/empty in DB, keep it but log a warning
			const title = data.title || null;
			if (!title || title.trim() === '') {
				console.error('[getUserCollectionById] WARNING: Collection has null/empty title:', { id, title: data.title });
			}

			return {
				...data,
				title: title, // Explicitly set title to ensure it's preserved
				snippets: snippets,
			} as Collection;
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
