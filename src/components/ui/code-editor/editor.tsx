"use client";

import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import CodeEditor from "react-simple-code-editor";
import hljs from "highlight.js";
import flourite from "flourite";
import { useTheme } from "next-themes";
import { useMutation, useQueryClient } from "react-query";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@/lib/utils";
import { codeSnippets } from "@/lib/code-snippets-options";
import { languagesLogos } from "@/lib/language-logos";
import { LanguageProps } from "@/lib/language-options";
import { fonts } from "@/lib/fonts-options";
import { themes } from "@/lib/themes-options";
import {
  EditorState,
  useEditorStore,
  useUserStore,
} from "@/app/store";
import { hotKeyList } from "@/lib/hot-key-list";
import { LoginDialog } from "@/app/auth/login";
import { Button } from "../button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";
import { Skeleton } from "../skeleton";
import { TitleInput } from "./title-input";
import { WidthMeasurement } from "./width-measurement";
import * as S from "./styles";
import {
  createSnippet,
  getSnippetByMatchingUrl,
  removeSnippet,
} from "./helpers";

type EditorProps = {
  activeTab: string;
  padding: number;
  width: string;
  setWidth: (value: React.SetStateAction<string>) => void;
  isWidthVisible: boolean;
  isLoading: boolean;
};

const focusEditor = hotKeyList.filter(
  (item) => item.label === "Focus code editor"
);
const unfocusEditor = hotKeyList.filter(
  (item) => item.label === "Unfocus code editor"
);

export const Editor = forwardRef<any, EditorProps>(
  (
    { activeTab, padding, width, isWidthVisible = false, setWidth, isLoading },
    ref
  ) => {
    const { theme } = useTheme();
    const editorRef = useRef(null);
    const [currentHref, setCurrentHref] = useState<string | null>(null);
    const [userHasEditedCode, setUserHasEditedCode] = useState<boolean>(false);
    const [currentUrlOrigin, setCurrentUrlOrigin] = useState<string | null>(
      null
    );
    const queryClient = useQueryClient();

    const isDarkTheme = theme === "dark";

    const user = useUserStore((state) => state.user);

    const currentState = useEditorStore((state) =>
      state.editors.find((editor) => editor.id === activeTab)
    );

    const updateEditor = useEditorStore((state) => state.updateEditor);

    const code = currentState?.code;
    const hasUserEditedCode = currentState?.hasUserEditedCode;
    const fontFamily = currentState?.fontFamily;
    const fontSize = currentState?.fontSize;
    const showBackground = currentState?.showBackground;
    const backgroundTheme = currentState?.backgroundTheme;
    const language = currentState?.language;
    const autoDetectLanguage = currentState?.autoDetectLanguage;
    const editorShowLineNumbers = currentState?.editorShowLineNumbers;
    const editorPreferences = currentState?.editor;
    const presentational = currentState?.presentational;
    const isSnippetSaved = currentState?.isSnippetSaved;

    const [lineNumbers, setLineNumbers] = useState<number[]>([]);

    //TODO: beautify and format the code according to the language

    useEffect(() => {
      const randomSnippet =
        codeSnippets[Math.floor(Math.random() * codeSnippets.length)];

      if (presentational) {
        return;
      }

      // if (!userHasEditedCode) {
      //   setCode(randomSnippet.code);
      // }
    }, [presentational, userHasEditedCode]);

    useEffect(() => {
      if (autoDetectLanguage) {
        const { language: detecTedLanguage } = flourite(code || "", {
          noUnknown: true,
        });

        updateEditor(currentState.id, {
          language: detecTedLanguage.toLowerCase() || "plaintext",
        });
      }
    }, [autoDetectLanguage, code]);

    useEffect(() => {
      const urlObj = new URL(window.location.href);

      setCurrentUrlOrigin(urlObj.origin);
    }, []);

    useEffect(() => {
      const lines = code!.split("\n").length;
      setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
    }, [code]);

    const user_id = useMemo(() => {
      if (user) {
        return user?.id;
      }
    }, [user]);

    useHotkeys(focusEditor[0].hotKey, () => {
      if (editorRef.current) {
        //@ts-ignore
        const inputElement = editorRef.current._input as HTMLInputElement;
        inputElement.select();
      }
    });

    useHotkeys(unfocusEditor[0].hotKey, () => {
      if (editorRef.current) {
        //@ts-ignore
        const inputElement = editorRef.current._input as HTMLInputElement;
        inputElement.blur();
      }
    });

    const { mutate: handleCreateSnippet } = useMutation({
      mutationFn: () =>
        createSnippet({
          user_id,
          currentUrl: currentUrlOrigin,
          title: currentState?.title || "Untitled",
          code: code!,
          language: language!,
          state: currentState!,
        }),

      onMutate: async () => {
        // (Cancel any outgoing refetches so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey: ["snippets"] });

        const previousSnippets = queryClient.getQueryData(["snippets"]);

        // Optimistically update to the new value
        // queryClient.setQueryData<Snippet[]>(
        //   ["snippets"],
        //   (old: Snippet[] | undefined) => [...(old || []), newSnippet]
        // );

        updateEditor(currentState!.id, {
          isSnippetSaved: true,
        });

        return { previousSnippets };
      },

      onSuccess(data) {
        setCurrentHref(data?.data.url);
      },

      onError: (err, newSnippet, context) => {
        if (context) {
          queryClient.setQueryData(["snippets"], context.previousSnippets);
        }
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["snippets"] });
      },
    });

    const { mutate: handleRemoveSnippet } = useMutation({
      mutationFn: async () => {
        const data = await getSnippetByMatchingUrl({
          currentUrl: currentHref,
        });
        return removeSnippet({
          user_id: user?.id,
          snippet_id: data && data.data.id,
        });
      },
      onSuccess: () => {
        updateEditor(currentState!.id, {
          isSnippetSaved: false,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["snippets"] });
      },
    });

    //TODO: adding tabs and open new clean editor view

    return (
      <>
        <div
          className={cn(
            S.background(),
            showBackground &&
              !presentational &&
              themes[backgroundTheme!].background
          )}
          style={{ padding }}
          ref={ref}
          id="editor"
        >
          {!user ? (
            <LoginDialog>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  S.bookmarkButton(),
                  padding > 44 ? "top-2 right-2" : "top-0 right-0"
                )}
              >
                <i className="ri-bookmark-line" />
              </Button>
            </LoginDialog>
          ) : (
            <div>
              {!isSnippetSaved ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCreateSnippet()}
                  className={cn(
                    S.bookmarkButton(),
                    padding > 44 ? "top-2 right-2" : "top-1 right-1"
                  )}
                >
                  <i className="ri-bookmark-line" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveSnippet()}
                  className={cn(
                    S.bookmarkButton(),
                    padding > 44 ? "top-2 right-2" : "top-1 right-1"
                  )}
                >
                  <i className="ri-bookmark-fill" />
                </Button>
              )}
            </div>
          )}

          <div className={S.editorContainer({ isDarkTheme })}>
            <Tabs defaultValue="initial">
              <header className={S.header({ editorPreferences })}>
                {editorPreferences === "default" && (
                  <div className="flex gap-1.5">
                    <div className="rounded-full h-3 w-3 bg-red-500" />
                    <div className="rounded-full h-3 w-3 bg-yellow-500" />
                    <div className="rounded-full h-3 w-3 bg-green-500" />
                  </div>
                )}

                <div className={S.title({ editorPreferences })}>
                  <TabsList>
                    <TabsTrigger value="initial" className="relative">
                      <TitleInput
                        currentState={currentState || ({} as EditorState)}
                        icon={languagesLogos[language as LanguageProps]}
                        disabled={presentational}
                        deletable={false}
                      />
                    </TabsTrigger>
                  </TabsList>
                </div>
              </header>

              <TabsContent value="initial">
                <section
                  className={cn(
                    "px-4 py-4",
                    isDarkTheme
                      ? "brightness-110"
                      : "text-stone-800 contrast-200 brightness-[0.65]"
                  )}
                >
                  {editorShowLineNumbers && !isLoading ? (
                    <div
                      className={S.lineNumbers()}
                      style={{ lineHeight: (fontSize || 14) * 1.7 + "px" }}
                    >
                      {lineNumbers.map((num) => (
                        <div key={num}>{num}</div>
                      ))}
                    </div>
                  ) : null}

                  {!isLoading ? (
                    <CodeEditor
                      ref={editorRef}
                      className={S.editor({
                        showLineNumbers: editorShowLineNumbers,
                      })}
                      value={code || ""}
                      onValueChange={(code) => {
                        setUserHasEditedCode(true);
                        updateEditor(currentState!.id, {
                          code,
                        });
                      }}
                      disabled={presentational}
                      highlight={(code) =>
                        hljs.highlight(code, {
                          language: language || "plaintext",
                        }).value
                      }
                      style={{
                        fontFamily: fonts[fontFamily || "robotoMono"].name,
                        fontSize: fontSize,
                        lineHeight: (fontSize || 14) * 1.7 + "px",
                      }}
                      textareaClassName="focus:outline-none"
                      onClick={(e) => {
                        (e.target as HTMLTextAreaElement).select();
                      }}
                    />
                  ) : (
                    <div className="flex flex-col w-full space-y-4">
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                    </div>
                  )}
                </section>
              </TabsContent>

              <TabsContent value="new-tab"></TabsContent>
            </Tabs>
          </div>

          <WidthMeasurement isVisible={isWidthVisible} width={width} />
        </div>

        <div
          className={cn(
            "transition-opacity w-fit mx-auto relative",
            isWidthVisible || width === "auto"
              ? "invisible opacity-0"
              : "visible opacity-100"
          )}
        >
          <Button
            size="sm"
            onClick={() => setWidth("auto")}
            variant="ghost"
            className={cn(
              S.widthButton(),
              padding > 48 ? "bottom-16" : "bottom-10"
            )}
          >
            <i className="ri-close-circle-fill mr-2" />
            Reset width
          </Button>
        </div>
      </>
    );
  }
);

Editor.displayName = "Editor";
