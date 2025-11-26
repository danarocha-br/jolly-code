"use client";
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
  removeEditor: (tabId: string) => void;
  createNewTab: () => string;
  setActiveTab: (tabId: string) => void;
  addEditor: (editor: EditorState) => void;
  resetEditors: () => void;
  resetIsSnippetSaved: () => void;
  currentEditorState: EditorState | null;
  activeEditorTabId: string;
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

function createNewTab(index: number): EditorState {
  return {
    id: uuidv4(),
    code: "",
    title: `Untitled ${index}`,
    language: "plaintext",
    autoDetectLanguage: false,
    userHasEditedCode: false,
    editorShowLineNumbers: false,
    isSnippetSaved: false,
  };
}

export const useEditorStore = create<
  EditorStoreState,
  [["zustand/persist", EditorStoreState]]
>(
  persist(
    (set, get) => {
      const initialEditor = createNewTab(1);
      return {
        editors: [initialEditor],
        backgroundTheme: "sublime",
        showBackground: true,
        fontSize: 15,
        fontFamily: "robotoMono",
        padding: 60,
        presentational: false,
        editor: "default",
        currentEditorState: initialEditor,
        activeEditorTabId: initialEditor.id,

        updateEditor: (tabId: string, changes: Partial<EditorState>) => {
          set((state) => {
            const editorIndex = state.editors.findIndex(
              (editor) => editor.id === tabId
            );
            if (editorIndex !== -1) {
              const updatedEditors = [...state.editors];
              updatedEditors[editorIndex] = {
                ...updatedEditors[editorIndex],
                ...changes,
              };
              return { ...state, editors: updatedEditors };
            }
            return state;
          });
        },

        removeEditor: (tabId) =>
          set((state) => ({
            ...state,
            editors: state.editors.filter((editor) => editor.id !== tabId),
          })),

        createNewTab: () => {
          const newTabId = uuidv4();
          const newTab = {
            id: newTabId,
            code: "",
            title: `Untitled ${get().editors.length + 1}`,
            language: "plaintext",
            autoDetectLanguage: false,
            userHasEditedCode: false,
            editorShowLineNumbers: false,
            isSnippetSaved: false,
          };
          set((state) => ({ ...state, editors: [...state.editors, newTab] }));
          return newTabId;
        },

        setActiveTab: (tabId: string) => {
          const { activeEditorTabId, editors } = get();
          if (tabId !== activeEditorTabId) {
            const currentEditor = editors.find((editor) => editor.id === tabId);
            if (currentEditor) {
              set(() => ({
                currentEditorState: currentEditor,
                activeEditorTabId: tabId,
              }));
            }
          }
        },

        resetIsSnippetSaved: () => {
          set((state) => {
            const updatedEditors = state.editors.map((editor) => ({
              ...editor,
              isSnippetSaved: false,
            }));
            return { ...state, editors: updatedEditors };
          });
        },

        resetEditors: () => {
          const initialEditor = createNewTab(1);
          set(() => ({
            editors: [initialEditor],
            currentEditorState: initialEditor,
            activeEditorTabId: initialEditor.id,
          }));
        },

        addEditor: (editor: EditorState) =>
          set((state) => ({ editors: [...state.editors, editor] })),
      };
    },
    { name: "code-store" }
  )
);
