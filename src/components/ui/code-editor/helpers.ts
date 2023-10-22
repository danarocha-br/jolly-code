import { EditorState } from "@/app/store";
import { toast } from "sonner";

const headers = { "Content-Type": "application/json" };

type CreateSnippetProps = {
  id: string;
  user_id: string | undefined;
  currentUrl: string | undefined | null;
  title?: string;
  code: string;
  language: string;
  state: EditorState;
};

type UpdateSnippetProps = {
  id: string;
  user_id: string | undefined;
  currentUrl?: string | undefined | null;
  title?: string;
  code?: string;
  language?: string;
  state?: EditorState;
};

type RemoveSnippetProps = {
  user_id: string | undefined;
  snippet_id: string | undefined;
};

function createUrl(
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

function transformState(state: EditorState) {
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
 * Create a code snippet and save it to the database.
 * @return {Promise<{ data }>} The response object with the saved snippet data.
 */
export async function createSnippet({
  id,
  currentUrl,
  user_id,
  title,
  code,
  language,
  state,
}: CreateSnippetProps) {
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
      return;
    } else {
      toast.success("Snippet updated.");
    }
    const { data } = await response.json();

    return { data };
  } catch (error) {}
}
