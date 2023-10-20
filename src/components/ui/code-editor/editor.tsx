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
import { fonts } from "@/lib/fonts-options";
import { themes } from "@/lib/themes-options";
import { useEditorStore, useUserStore } from "@/app/store";
import { hotKeyList } from "@/lib/hot-key-list";
import { LoginDialog } from "@/app/auth/login";
import { useMediaQuery } from "@/lib/utils/media-query";
import { Button } from "../button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";
import { Skeleton } from "../skeleton";
import { TitleInput } from "./title-input";
import { WidthMeasurement } from "./width-measurement";
import * as S from "./styles";
import { createSnippet, removeSnippet } from "./helpers";

type EditorProps = {
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
  ({ padding, width, isWidthVisible = false, setWidth, isLoading }, ref) => {
    const editorRef = useRef(null);
    const { theme } = useTheme();
    const isDarkTheme = theme === "dark";
    const isMobile = useMediaQuery("(max-width: 768px)");

    const [currentUrlOrigin, setCurrentUrlOrigin] = useState<string | null>(
      null
    );
    const queryClient = useQueryClient();

    const user = useUserStore((state) => state.user);

    const currentState = useEditorStore((state) => state.currentEditorState);
    const editors = useEditorStore((state) => state.editors);

    const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
    const showBackground = useEditorStore((state) => state.showBackground);
    const fontFamily = useEditorStore((state) => state.fontFamily);
    const fontSize = useEditorStore((state) => state.fontSize);
    const editorPreferences = useEditorStore((state) => state.editor);
    const presentational = useEditorStore((state) => state.presentational);

    const {
      code,
      userHasEditedCode,
      isSnippetSaved,
      language,
      autoDetectLanguage,
      editorShowLineNumbers,
    } = useEditorStore((state) => {
      const editor = state.editors.find(
        (editor) => editor.id === currentState?.id
      );
      return editor
        ? {
            code: editor.code,
            userHasEditedCode: editor.userHasEditedCode,
            isSnippetSaved: editor.isSnippetSaved,
            language: editor.language,
            autoDetectLanguage: editor.autoDetectLanguage,
            editorShowLineNumbers: editor.editorShowLineNumbers,
          }
        : {
            code: "",
            userHasEditedCode: false,
            isSnippetSaved: false,
            language: "plain-text",
            autoDetectLanguage: true,
            editorShowLineNumbers: false,
          };
    });

    const { updateEditor } = useEditorStore((state) => state);

    const [lineNumbers, setLineNumbers] = useState<number[]>([]);

    //TODO: beautify and format the code according to the language

    useEffect(() => {
      const randomSnippet =
        codeSnippets[Math.floor(Math.random() * codeSnippets.length)];

      if (currentState && editors.length === 1) {
        useEditorStore.setState({
          editors: editors.map((editor) => {
            if (editor.id === currentState?.id) {
              return {
                ...editor,
                code: randomSnippet.code,
                language: randomSnippet.language,
              };
            }
            return editor;
          }),
        });
      }
    }, []);

    useEffect(() => {
      if (autoDetectLanguage) {
        const { language: detecTedLanguage } = flourite(code, {
          noUnknown: true,
        });

        useEditorStore.setState({
          editors: editors.map((editor) => {
            if (editor.id === currentState?.id) {
              return {
                ...editor,
                language: detecTedLanguage.toLowerCase() || "plaintext",
              };
            }
            return editor;
          }),
        });
      }
    }, [autoDetectLanguage, code]);

    useEffect(() => {
      const urlObj = new URL(window.location.href);

      setCurrentUrlOrigin(urlObj.origin);
    }, []);

    useEffect(() => {
      const lines = code.split("\n").length;
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
          id: currentState?.id!,
          user_id,
          currentUrl: currentUrlOrigin,
          title: currentState?.title || "Untitled",
          code: code,
          language: language,
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

        useEditorStore.setState({
          editors: editors.map((editor) => {
            if (editor.id === currentState?.id) {
              return {
                ...editor,
                isSnippetSaved: true,
              };
            }
            return editor;
          }),
        });

        return { previousSnippets };
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
        return removeSnippet({
          user_id: user?.id,
          snippet_id: currentState?.id,
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
                        language={language}
                        disabled={presentational}
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
                      value={code}
                      onValueChange={(code) => {
                        useEditorStore.setState({
                          editors: editors.map((editor) => {
                            if (editor.id === currentState?.id) {
                              return {
                                ...editor,
                                code: code,
                                userHasEditedCode: true,
                              };
                            }
                            return editor;
                          }),
                        });

                        // if (currentState) {
                        //   updateEditor(currentState.id, {
                        //     code: code,
                        //     userHasEditedCode: true,
                        //   });
                        // }
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

              {/* <TabsContent value="new-tab"></TabsContent> */}
            </Tabs>
          </div>

          <WidthMeasurement isVisible={isWidthVisible} width={width} />
        </div>

        <div
          className={cn(
            "transition-opacity w-fit mx-auto relative",
            isWidthVisible || width === "320px" || width === "720px"
              ? "invisible opacity-0"
              : "visible opacity-100"
          )}
        >
          <Button
            size="sm"
            onClick={() => setWidth(isMobile ? "320px" : "720px")}
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
