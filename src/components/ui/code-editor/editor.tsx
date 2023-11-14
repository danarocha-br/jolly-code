"use client";

import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import CodeEditor from "react-simple-code-editor";
import hljs from "highlight.js";
import flourite from "flourite";
import { useTheme } from "next-themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@/lib/utils";
import { codeSnippets } from "@/lib/code-snippets-options";
import { fonts } from "@/lib/fonts-options";
import { themes } from "@/lib/themes-options";
import { EditorState, useEditorStore, useUserStore } from "@/app/store";
import { hotKeyList } from "@/lib/hot-key-list";
import { LoginDialog } from "@/app/auth/login";
import { useMediaQuery } from "@/lib/utils/media-query";
import { Button } from "../button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";
import { Skeleton } from "../skeleton";
import { TitleInput } from "./title-input";
import { WidthMeasurement } from "./width-measurement";
import { debounce } from "@/lib/utils/debounce";
import {
  createSnippet,
  removeSnippet,
  updateSnippet,
} from "@/feature-snippets/db-helpers";
import { Snippet } from "@/feature-snippets/dtos";
import * as S from "./styles";

type EditorProps = {
  padding: number;
  width: string;
  setWidth: (value: React.SetStateAction<string>) => void;
  isWidthVisible: boolean;
  currentEditor: EditorState | null;
  editors: EditorState[] | [];
  isLoading: boolean;
};

export type SnippetData = {
  id: string;
  title?: string;
  code?: string;
  state?: EditorState;
  language?: string;
  currentUrl?: string | null;
};

const focusEditor = hotKeyList.filter(
  (item) => item.label === "Focus code editor"
);
const unfocusEditor = hotKeyList.filter(
  (item) => item.label === "Unfocus code editor"
);

export const Editor = forwardRef<any, EditorProps>(
  (
    {
      padding,
      width,
      isWidthVisible = false,
      setWidth,
      isLoading,
      currentEditor,
      editors,
    },
    ref
  ) => {
    const editorRef = useRef(null);

    const { theme } = useTheme();
    const memoizedTheme = useMemo(() => theme, [theme]);
    const isDarkTheme = memoizedTheme === "dark";
    const isMobile = useMediaQuery("(max-width: 768px)");

    const [currentUrlOrigin, setCurrentUrlOrigin] = useState<string | null>(
      null
    );
    const queryClient = useQueryClient();

    const user = useUserStore((state) => state.user);

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
        (editor) => editor.id === currentEditor?.id
      );
      return editor
        ? {
            code: editor.code,
            title: editor.title,
            userHasEditedCode: editor.userHasEditedCode,
            isSnippetSaved: editor.isSnippetSaved,
            language: editor.language,
            autoDetectLanguage: editor.autoDetectLanguage,
            editorShowLineNumbers: editor.editorShowLineNumbers,
          }
        : {
            code: "",
            title: "Untitled",
            userHasEditedCode: false,
            isSnippetSaved: false,
            language: "plaintext",
            autoDetectLanguage: true,
            editorShowLineNumbers: false,
          };
    });

    const [lineNumbers, setLineNumbers] = useState<number[]>([]);

    //TODO: beautify and format the code according to the language

    useEffect(() => {
      const randomSnippet =
        codeSnippets[Math.floor(Math.random() * codeSnippets.length)];

      if (currentEditor && editors.length === 1 && !userHasEditedCode) {
        useEditorStore.setState({
          editors: editors.map((editor) => {
            if (editor.id === currentEditor?.id) {
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
            if (editor.id === currentEditor?.id) {
              return {
                ...editor,
                language: detecTedLanguage.toLowerCase() || "plaintext",
              };
            }
            return editor;
          }),
        });
      }
    }, [autoDetectLanguage, code, currentEditor?.id]);

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
      mutationFn: createSnippet,

      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: ["snippets"] });

        const previousSnippets = queryClient.getQueryData(["snippets"]);

        useEditorStore.setState({
          editors: editors.map((editor) => {
            if (editor.id === currentEditor?.id) {
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
      mutationFn: removeSnippet,

      onSuccess: () => {
        useEditorStore.setState({
          editors: editors.map((editor) => {
            if (editor.id === currentEditor?.id) {
              return {
                ...editor,
                isSnippetSaved: false,
              };
            }
            return editor;
          }),
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["snippets"] });
      },
    });

    const { mutate: handleUpdateSnippet } = useMutation({
      mutationFn: updateSnippet,

      onError: (err, variables, context) => {
        const { previousState } = context as { previousState: Snippet };

        queryClient.setQueryData(["snippets"], previousState);
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["snippets"] });
      },
    });

    const debouncedUpdateSnippet = useMemo(
      () =>
        debounce(
          (
            id: string,
            code: string,
            language: string,
            state: EditorState,
            currentUrl: string | null
          ) => {
            if (id) {
              handleUpdateSnippet({
                id: currentEditor?.id!,
                currentUrl,
                user_id,
                title: currentEditor?.title || "Untitled",
                code: code,
                language: language,
                state,
              });
            }
          },
          1000
        ),
      []
    );

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
          id={currentEditor?.id || "editor"}
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
              {!isSnippetSaved && code !== "" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    handleCreateSnippet({
                      id: currentEditor?.id!,
                      user_id,
                      currentUrl: currentUrlOrigin,
                      title: currentEditor?.title || "Untitled",
                      code: code,
                      language: language,
                      state: currentEditor!,
                    })
                  }
                  className={cn(
                    S.bookmarkButton(),
                    padding > 44 ? "top-2 right-2" : "top-1 right-1"
                  )}
                >
                  <i className="ri-bookmark-line" />
                </Button>
              ) : (
                code !== "" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      handleRemoveSnippet({
                        snippet_id: currentEditor?.id!,
                        user_id,
                      })
                    }
                    className={cn(
                      S.bookmarkButton(),
                      padding > 44 ? "top-2 right-2" : "top-1 right-1"
                    )}
                  >
                    <i className="ri-bookmark-fill" />
                  </Button>
                )
              )}
            </div>
          )}

          <div className={S.editorContainer({ isDarkTheme })}>
            <Tabs defaultValue="initial">
              <header className={S.header({ editorPreferences })}>
                <div className="flex gap-1.5">
                  <div
                    className={cn(
                      "rounded-full h-3 w-3",
                      editorPreferences === "default"
                        ? "bg-red-500"
                        : "bg-zinc-400/30 dark:bg-zinc-700/50"
                    )}
                  />
                  <div
                    className={cn(
                      "rounded-full h-3 w-3",
                      editorPreferences === "default"
                        ? "bg-yellow-500"
                        : "bg-zinc-400/30 dark:bg-zinc-700/50"
                    )}
                  />
                  <div
                    className={cn(
                      "rounded-full h-3 w-3",
                      editorPreferences === "default"
                        ? "bg-green-500"
                        : "bg-zinc-400/30 dark:bg-zinc-700/50"
                    )}
                  />
                </div>

                <div className={S.title({ editorPreferences })}>
                  <TabsList>
                    <TabsTrigger
                      value="initial"
                      className={cn(
                        "relative"
                        // editorPreferences === "minimal" && "!bg-transparent"
                      )}
                    >
                      <TitleInput
                        onUpdateTitle={handleUpdateSnippet}
                        language={language}
                        disabled={presentational}
                        userId={user_id ?? ""}
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
                            if (editor.id === currentEditor?.id) {
                              return {
                                ...editor,
                                code: code,
                                userHasEditedCode: true,
                              };
                            }
                            return editor;
                          }),
                        });
                        {
                          isSnippetSaved &&
                            debouncedUpdateSnippet(
                              currentEditor?.id!,
                              code,
                              language,
                              currentEditor!,
                              currentUrlOrigin
                            );
                        }
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
