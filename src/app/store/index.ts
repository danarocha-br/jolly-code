import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import { ThemeProps } from "@/lib/themes-options";
import { FontsProps } from "@/lib/fonts-options";

export type UserStoreState = {
  user: User | null;
};

export type EditorState = {
  id: string;
  code: string;
  hasUserEditedCode: boolean;
  title: string;
  backgroundTheme: ThemeProps;
  showBackground: boolean;
  language: string;
  autoDetectLanguage: boolean;
  fontSize: number;
  fontFamily: FontsProps;
  padding: number;
  presentational: boolean;
  editor: "default" | "minimal";
  editorShowLineNumbers: boolean;
  isSnippetSaved: boolean;
};

export type EditorStoreState = {
  editors: EditorState[];
  updateEditor: (tabId: string, changes: Partial<EditorState>) => void;
};

export const useUserStore = create<
  UserStoreState,
  [["zustand/persist", UserStoreState]]
>(
  persist(
    (set) => ({
      user: null,
    }),
    { name: "user-store" }
  )
);

export const useEditorStore = create<
  EditorStoreState,
  [["zustand/persist", EditorStoreState]]
>(
  persist(
    (set) => ({
      editors: [
        {
          id: "1",
          code: "",
          title: "Untitled",
          backgroundTheme: "sublime",
          showBackground: true,
          language: "plaintext",
          autoDetectLanguage: false,
          hasUserEditedCode: false,
          fontSize: 15,
          fontFamily: "robotoMono",
          padding: 60,
          presentational: false,
          editor: "default",
          editorShowLineNumbers: false,
          editorRef: null,
          isSnippetSaved: false,
        },
      ],
      updateEditor: (currentId, changes) =>
        set((state) => ({
          ...state,
          editors: state.editors.map((editor) =>
            editor.id === currentId ? { ...editor, ...changes } : editor
          ),
        })),
    }),
    { name: "code-store" }
  )
);
