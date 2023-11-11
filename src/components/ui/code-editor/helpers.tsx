import { EditorState } from "@/app/store";
import { Snippet } from '@/lib/services/database';
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


      // toast.success(
      //   <div className="flex justify-between items-center w-full gap-2">
      //     <p>Your code snippet is saved.</p>

      //     <DialogChooseCollection >
      //       <Button variant="secondary">Choose folder</Button>
      //     </DialogChooseCollection>
      //   </div>
      // );

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


