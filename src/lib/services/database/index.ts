import { SupabaseClient } from "@supabase/supabase-js";

export type Snippet = {
  id: string;
  user_id: string;
  code: string;
  language: string;
  title: string;
  url?: string | null;
  created_at?: string;
  supabase: SupabaseClient<Database, "public", any>;
};

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

  try {
    const { data, error } = await supabase
      .from("snippet")
      .insert([
        {
          id,
          user_id,
          title: sanitizedTitle,
          code,
          language,
          url,
        },
      ])
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
    const { data } = await supabase
      .from("snippet")
      .select()
      .eq("id", snippet_id)
      .eq("user_id", user_id);

    if (data && data.length > 0) {
      console.log("ID matches");
    } else {
      throw new Error("This snippet does not exist.");
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
 * Retrieves a snippet by matching the current URL and user ID.
 *
 * @param {Object} options - The options object.
 * @param {string} options.user_id - The user ID.
 * @param {string} options.current_url - The current URL.
 * @param {SupabaseClient<Database, "public", any>} options.supabase - The Supabase client.
 * @return {Promise<{ id: string }>} The snippet ID.
 */
// export async function getSnippetByMatchingUrl({
//   user_id,
//   current_url,
//   supabase,
// }: {
//   user_id: string;
//   current_url: string;
//   supabase: SupabaseClient<Database, "public", any>;
// }): Promise<{ id: string }> {
//   try {
//     const { data } = await supabase
//       .from("snippet")
//       .select("id")
//       .eq("url", current_url.trim())
//       .eq("user_id", user_id);

//     if (data && data.length > 0) {
//       return { id: data[0].id };
//     } else {
//       throw new Error("URL not found.");
//     }
//   } catch (error) {
//     console.error(error);
//     return Promise.reject(
//       new Error("An error occurred. Please try again later.")
//     );
//   }
// }
export async function getSnippetById({
  user_id,
  snippet_id,
  supabase,
}: {
  user_id: string;
  snippet_id: string;
  supabase: SupabaseClient<Database, "public", any>;
}): Promise<{ id: string }> {
  try {
    const { data } = await supabase
      .from("snippet")
      .select("id")
      .eq("id", snippet_id)
      .eq("user_id", user_id);

    if (data && data.length > 0) {
      return { id: data[0].id };
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
