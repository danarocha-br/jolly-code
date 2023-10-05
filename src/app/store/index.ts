import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ThemeProps } from "@/lib/themes-options";
import { FontsProps } from "@/lib/fonts-options";


export type StoreState = {
  code: string;
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
};

export const useUserSettingsStore = create<
  StoreState,
  [["zustand/persist", StoreState]]
>(
  persist(
    (set) => ({
      code: "",
      title: "Untitled",
      backgroundTheme: "sublime",
      showBackground: true,
      language: "plaintext",
      autoDetectLanguage: false,
      fontSize: 15,
      fontFamily: "robotoMono",
      padding: 60,
      presentational: false,
      editor: "minimal",
      editorShowLineNumbers: false,
      editorRef: null,
    }),
    { name: "user-settings" }
  )
);
