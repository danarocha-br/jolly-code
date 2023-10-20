import { EditorState } from "@/app/store";
import { toast } from "sonner";

const headers = { "Content-Type": "application/json" };

type CreateSnippetProps = {
  user_id: string | undefined;
  currentUrl: string | undefined | null;
  title: string;
  code: string;
  language: string;
  state: EditorState;
};

type RemoveSnippetProps = {
  user_id: string | undefined;
  snippet_id: string | undefined;
};

type GetSnippetByMatchingURLProps = {
  currentUrl: string | null;
};

/**
 * Create a code snippet and save it to the database.
 * @return {Promise<{ data }>} The response object with the saved snippet data.
 */
export async function createSnippet({
  currentUrl,
  user_id,
  title,
  code,
  language,
  state,
}: CreateSnippetProps) {
  function transformState(state: EditorState) {
    return Object.fromEntries(
      Object.entries(state).map(([key, value]) => {
        if (key === "user" && typeof value === "object" && value !== null) {
          return [key, value.id]; // Extract the id from the user object
        } else if (typeof value === "object" && value !== null) {
          return [key, JSON.stringify(value)];
        } else {
          return [key, String(value)];
        }
      })
    );
  }

  try {
    const stringifiedState = transformState(state);

    const queryParams = new URLSearchParams({
      ...stringifiedState,
      code: encodeURIComponent(code),
    });

    queryParams.delete("shared");

    const url = `${currentUrl}?${queryParams.toString()}`;

    const response = await fetch("/api/snippets", {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id,
        title,
        code,
        language,
        url,
      }),
    });

    if (!response.ok) {
      // const errorMessage = await response.text();
      toast.error(`Failed to save the snippet.`);
    } else {
      toast.success("Your code snippet is saved.", {
        action: {
          label: "Choose folder",
          onClick: () => console.log("Action!"),
        },
      });
    }
    const { data } = await response.json();

    return { data };
  } catch (error) {
    toast.error(`Failed to save the snippet.`);
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
 * Retrieves a snippet by matching the current URL.
 *
 * @param {GetSnippetByMatchingURLProps} currentUrl - The current URL to match against.
 * @return {Promise<{ data: any }>} An object containing the retrieved data.
 */
export async function getSnippetByMatchingUrl({
  currentUrl,
}: GetSnippetByMatchingURLProps) {
  try {
    const queryParams = new URLSearchParams({
      url: currentUrl || "",
    });
    const url = `/api/snippets?${queryParams.toString()}`;

    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      toast.error(`Something went wrong, please try again.`);
    }

    const { data } = await response.json();

    return { data };
  } catch (error) {
    toast.error(`Something went wrong, please try again.`);
  }
}
