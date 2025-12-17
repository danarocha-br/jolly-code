"use client";
import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import CodeEditor from "react-simple-code-editor";
import hljs from "highlight.js";
import flourite from "flourite";
import { useTheme } from "next-themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/shallow";

import { cn } from "@/lib/utils";
import { codeSnippets } from "@/lib/code-snippets-options";
import { fonts } from "@/lib/fonts-options";
import { themes } from "@/lib/themes-options";
import { EditorState, useEditorStore, useUserStore } from "@/app/store";
import { toast } from "sonner";
import { hotKeyList } from "@/lib/hot-key-list";
import { useMediaQuery } from "@/lib/utils/media-query";
import { debounce } from "@/lib/utils/debounce";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginDialog } from "@/features/login";
import { Logo } from "@/components/ui/logo";
import {
  createSnippet,
  removeSnippet,
  updateSnippet,
  type CreateSnippetProps,
  type RemoveSnippetProps,
} from "@/features/snippets/queries";
import { Collection, Snippet } from "@/features/snippets/dtos";
import { TitleInput } from "./title-input";
import { WidthMeasurement } from "./width-measurement";
import { analytics } from "@/lib/services/tracking";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import { USAGE_QUERY_KEY, useUserUsage } from "@/features/user/queries";
import { ActionResult } from "@/actions/utils/action-result";
import { getUsageLimitsCacheProvider } from "@/lib/services/usage-limits-cache";
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

/**
 * Determines if an error indicates an upgrade/plan limit condition.
 * Checks for explicit error codes and upgrade-related keywords in the error message.
 */
function isUpgradeError(error: unknown): boolean {
  if (!error) return false;

  // Handle error objects with code or type properties
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Check for explicit error codes
    if (errorObj.code === "UPGRADE_REQUIRED" || errorObj.code === "PLAN_LIMIT_EXCEEDED") {
      return true;
    }

    // Check error.type for upgrade markers
    if (typeof errorObj.type === "string" && errorObj.type.toLowerCase().includes("upgrade")) {
      return true;
    }

    // Extract message from error object if available
    if (typeof errorObj.message === "string") {
      error = errorObj.message;
    } else if (typeof errorObj.error === "string") {
      error = errorObj.error;
    }
  }

  // Handle string errors
  if (typeof error !== "string") {
    return false;
  }

  const errorLower = error.toLowerCase();

  // Check for explicit upgrade-related keywords
  const upgradeKeywords = [
    "upgrade",
    "limit reached",
    "plan limit",
    "reached your",
    "exceeded",
    "over limit",
  ];

  return upgradeKeywords.some((keyword) => errorLower.includes(keyword));
}

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
    const containerRef = useRef<HTMLDivElement>(null);

    const { theme } = useTheme();
    const memoizedTheme = useMemo(() => theme, [theme]);
    const isDarkTheme = memoizedTheme === "dark";
    const isMobile = useMediaQuery("(max-width: 768px)");

    const [currentUrlOrigin, setCurrentUrlOrigin] = useState<string | null>(
      null
    );
    const [isExporting, setIsExporting] = useState(false);
    const queryClient = useQueryClient();
    const queryKey = ["collections"];

    // Sync data-exporting attribute with DOM changes from export menu
    // The export menu (src/features/export/export-menu.tsx) directly manipulates
    // the DOM attribute, so we use MutationObserver to sync React state.
    // This ensures the watermark visibility (group-data-[exporting=true]/export:flex)
    // works correctly during exports.
    useEffect(() => {
      if (!containerRef.current) return;

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "data-exporting"
          ) {
            const element = mutation.target as HTMLElement;
            const exporting = element.dataset.exporting === "true";
            setIsExporting(exporting);
          }
        });
      });

      observer.observe(containerRef.current, {
        attributes: true,
        attributeFilter: ["data-exporting"],
      });

      // Initial check
      const initialValue = containerRef.current.dataset.exporting === "true";
      setIsExporting(initialValue);

      return () => {
        observer.disconnect();
      };
    }, []);

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
    } = useEditorStore(
      useShallow((state) => {
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
      })
    );

    const [lineNumbers, setLineNumbers] = useState<number[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    //TODO: beautify and format the code according to the language

    // Only run on client after mount to avoid hydration mismatch
    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      // Only select random snippet on client side after mount
      if (!isMounted) return;

      const randomSnippet =
        codeSnippets[Math.floor(Math.random() * codeSnippets.length)];

      if (currentEditor && editors.length === 1 && !userHasEditedCode && !code) {
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
    }, [code, currentEditor, editors, userHasEditedCode, isMounted]);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const { data: usage, isLoading: isUsageLoading, refetch: refetchUsage } = useUserUsage(user_id);
    const snippetLimit = usage?.snippets;
    
    // Refetch usage data when user logs in
    useEffect(() => {
      if (user_id && !isUsageLoading) {
        refetchUsage();
      }
    }, [user_id]); // Only depend on user_id to trigger on user change
    // Check if limit is reached: current >= max (can't save if at or over limit)
    // Also check overLimit flag which indicates existing over-limit content
    const snippetLimitReached =
      (snippetLimit?.max !== null &&
        typeof snippetLimit?.max !== "undefined" &&
        snippetLimit.current >= snippetLimit.max) ||
      (snippetLimit?.overLimit ?? 0) > 0;
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

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

    const { mutate: handleCreateSnippet } = useMutation<
      ActionResult<Snippet>,
      Error,
      CreateSnippetProps,
      { previousSnippets: unknown; previousEditorState: EditorState | null; editorId: string | undefined }
    >({
      mutationFn: createSnippet,

      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        // Also cancel usage queries to ensure fresh data for limit check
        if (user_id) {
          await queryClient.cancelQueries({ queryKey: [USAGE_QUERY_KEY, user_id] });
        }

        const previousSnippets = queryClient.getQueryData(queryKey);

        // Store editor ID and previous state for rollback
        const editorId = currentEditor?.id;
        const previousEditorState = currentEditor ? { ...currentEditor } : null;

        // Optimistically update UI (will be reverted if save fails)
        if (editorId) {
          useEditorStore.setState({
            editors: editors.map((editor) => {
              if (editor.id === editorId) {
                return {
                  ...editor,
                  isSnippetSaved: true,
                };
              }
              return editor;
            }),
          });
        }

        return { previousSnippets, previousEditorState, editorId };
      },

      onError: (err, newSnippet, context) => {
        if (context) {
          queryClient.setQueryData(queryKey, context.previousSnippets);
          // Revert optimistic editor state update using stored editor ID
          if (context.previousEditorState && context.editorId) {
            const currentEditors = useEditorStore.getState().editors;
            const previousState = context.previousEditorState;
            useEditorStore.setState({
              editors: currentEditors.map((editor) => {
                if (editor.id === context.editorId) {
                  return previousState;
                }
                return editor;
              }),
            });
          }
        }
        // Only open upgrade dialog if error indicates upgrade/limit condition
        if (isUpgradeError(err)) {
          setIsUpgradeOpen(true);
        }
      },

      onSettled: (data, error, variables, context) => {
        const actionResult: ActionResult<Snippet> | undefined = data;

        if (actionResult?.error) {
          toast.error(actionResult.error);
          // Revert optimistic editor state update on error using stored editor ID
          if (context?.previousEditorState && context?.editorId) {
            const currentEditors = useEditorStore.getState().editors;
            const previousState = context.previousEditorState;
            const editorId = context.editorId;
            useEditorStore.setState({
              editors: currentEditors.map((editor) => {
                if (editor.id === editorId) {
                  return previousState;
                }
                return editor;
              }).filter((editor): editor is EditorState => editor !== null),
            });
          }
          // Only open upgrade dialog if error indicates upgrade/limit condition
          if (isUpgradeError(actionResult.error)) {
            setIsUpgradeOpen(true);
          }
        }

        if (actionResult && !actionResult.error && actionResult.data) {
          analytics.track("create_snippet", {
            snippet_id: actionResult.data.id,
            language: variables.language,
          });
        }
        // Clear the usage limits cache BEFORE any query invalidation to prevent race condition
        // This must happen synchronously before invalidateQueries triggers refetch
        if (user_id) {
          const cacheProvider = getUsageLimitsCacheProvider();
          cacheProvider.delete(user_id);
        }
        queryClient.invalidateQueries({ queryKey });
        if (user_id) {
          // Invalidate after cache is cleared to ensure fresh data
          queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, user_id] });
        }
      },
    });

    const { mutate: handleRemoveSnippet } = useMutation<
      void,
      Error,
      RemoveSnippetProps,
      { previousSnippets: unknown }
    >({
      mutationFn: removeSnippet,
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: queryKey });

        const previousSnippets = queryClient.getQueryData(queryKey);
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
        return { previousSnippets };
      },

      onError: (err, variables, context) => {
        if (context) {
          queryClient.setQueryData(queryKey, context.previousSnippets);
        }
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKey });
        if (user_id) {
          queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, user_id] });
        }
      },
    });

    const { mutate: handleUpdateSnippet } = useMutation({
      mutationFn: updateSnippet,

      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: queryKey,
        });

        const previousCollections = queryClient.getQueryData<Collection[]>(queryKey);

        // Optimistically update the collections cache
        if (previousCollections) {
          queryClient.setQueryData<Collection[]>(
            queryKey,
            previousCollections.map((collection) => ({
              ...collection,
              snippets: collection.snippets?.map((snippet) =>
                snippet.id === variables.id
                  ? { ...snippet, title: variables.title || snippet.title }
                  : snippet
              ),
            }))
          );
        }

        return { previousCollections };
      },

      onError: (err, variables, context) => {
        if (context?.previousCollections) {
          queryClient.setQueryData(queryKey, context.previousCollections);
        }
      },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKey,
        });
        // Invalidate snippet queries to refresh title in collection list
        queryClient.invalidateQueries({ queryKey: ['snippet'] });
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: queryKey,
        });
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
      [currentEditor, handleUpdateSnippet, user_id]
    );

    const handleSaveSnippet = () => {
      // Validate user session
      if (!user || !user_id) {
        toast.error("Please log in to save snippets.");
        return;
      }

      // Wait for usage data to load before allowing save
      if (isUsageLoading || !usage) {
        toast.error("Loading your account limits. Please try again in a moment.");
        return;
      }

      if (snippetLimitReached) {
        analytics.track("limit_reached", {
          limit_type: "snippets",
          current: snippetLimit?.current ?? 0,
          max: snippetLimit?.max ?? null,
        });
        setIsUpgradeOpen(true);
        analytics.track("upgrade_prompt_shown", {
          limit_type: "snippets",
          trigger: "save_attempt",
        });
        return;
      }

      handleCreateSnippet({
        id: currentEditor?.id!,
        user_id,
        currentUrl: currentUrlOrigin,
        title: currentEditor?.title || "Untitled",
        code: code,
        language: language,
        state: currentEditor!,
      });
    };

    return (
      <>
        <UpgradeDialog
          open={isUpgradeOpen}
          onOpenChange={setIsUpgradeOpen}
          limitType="snippets"
          currentCount={snippetLimit?.current}
          maxCount={snippetLimit?.max ?? null}
        />
        <div
          className={cn(
            S.background(),
            showBackground &&
            !presentational &&
            themes[backgroundTheme!].background,
            "relative overflow-hidden group/export"
          )}
          style={{ padding }}
          ref={(node) => {
            // Merge refs: forwardRef and containerRef
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            containerRef.current = node;
          }}
          id={currentEditor?.id || "editor"}
          data-exporting={isExporting ? "true" : "false"}
        >
          {!user ? (
            <LoginDialog>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  S.bookmarkButton({ onDark: isDarkTheme }),
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
                  onClick={handleSaveSnippet}
                  className={cn(
                    S.bookmarkButton({ onDark: isDarkTheme }),
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
                      S.bookmarkButton({ onDark: isDarkTheme }),
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
                  <TitleInput
                    onUpdateTitle={handleUpdateSnippet}
                    language={language}
                    disabled={presentational}
                    userId={user_id ?? ""}
                  />
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

            </Tabs>
          </div>

          <WidthMeasurement isVisible={isWidthVisible} width={width} />

          {/* Watermark (included in exports) */}
          <div className="pointer-events-none select-none absolute bottom-0 right-0 hidden items-center gap-3 opacity-80 group-data-[exporting=true]/export:flex">
            <span
              className={cn(
                "text-xs font-medium tracking-wide",
                isDarkTheme ? "text-white/40" : "text-stone-800/40"
              )}
            >
              jollycode.dev
            </span>
            <Logo
              variant="short"
              className={cn(
                "scale-[0.4] -ml-6 grayscale contrast-150 opacity-30",
              )}
            />
          </div>
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
