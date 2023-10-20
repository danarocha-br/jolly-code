import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@supabase/supabase-js";

import { ThemeProps } from "@/lib/themes-options";
import { FontsProps } from "@/lib/fonts-options";

export type UserStoreState = {
  user: User | null;
};

export type EditorState = {
  id: string;
  code: string;
  userHasEditedCode: boolean;
  title: string;
  language: string;
  autoDetectLanguage: boolean;
  editorShowLineNumbers: boolean;
  isSnippetSaved: boolean;
};

export type EditorStoreState = {
  editors: EditorState[];
  updateEditor: (tabId: string, changes: Partial<EditorState>) => void;
  currentEditorTab: string;
  backgroundTheme: ThemeProps;
  showBackground: boolean;
  fontSize: number;
  fontFamily: FontsProps;
  padding: number;
  presentational: boolean;
  editor: "default" | "minimal";
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
          language: "plaintext",
          autoDetectLanguage: false,
          userHasEditedCode: false,
          editorShowLineNumbers: false,
          editorRef: null,
          isSnippetSaved: false,
        },
      ],
      backgroundTheme: "sublime",
      showBackground: true,
      fontSize: 15,
      fontFamily: "robotoMono",
      padding: 60,
      presentational: false,
      editor: "default",
      currentEditorTab: "1",

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
