import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@supabase/supabase-js";

import { ThemeProps } from "@/lib/themes-options";
import { FontsProps } from "@/lib/fonts-options";

export type UserStoreState = {
  user: User | null;
};

export type EditorStoreState = {
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
      code: "",
      setCode: (newCode: string) => set({ code: newCode }),
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
    }),
    { name: "code-store" }
  )
);
