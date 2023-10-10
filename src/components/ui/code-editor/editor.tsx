"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import CodeEditor from "react-simple-code-editor";
import hljs from "highlight.js";
import flourite from "flourite";
import { useTheme } from "next-themes";

import { codeSnippets } from "@/lib/code-snippets-options";
import { languagesLogos } from "@/lib/language-logos";
import { LanguageProps } from "@/lib/language-options";
import { fonts } from "@/lib/fonts-options";
import { themes } from "@/lib/themes-options";
import { cn } from "@/lib/utils";
import { useUserSettingsStore } from "@/app/store";
import { LoginDialog } from "@/app/auth/login";
import { TitleInput } from "./title-input";
import { Button } from "../button";
import { WidthMeasurement } from "./width-measurement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";
import { Skeleton } from "../skeleton";
import * as S from "./styles";
import { hotKeyList } from "@/lib/hot-key-list";
import { useHotkeys } from "react-hotkeys-hook";

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
    const { theme } = useTheme();
    const editorRef = useRef(null);

    const user = useUserSettingsStore((state) => state.user);
    const isDarkTheme = theme === "dark";
    const code = useUserSettingsStore((state) => state.code);
    const hasUserEditedCode = useUserSettingsStore(
      (state) => state.hasUserEditedCode
    );
    const fontFamily = useUserSettingsStore((state) => state.fontFamily);
    const fontSize = useUserSettingsStore((state) => state.fontSize);
    const showBackground = useUserSettingsStore(
      (state) => state.showBackground
    );
    const backgroundTheme = useUserSettingsStore(
      (state) => state.backgroundTheme
    );
    const language = useUserSettingsStore((state) => state.language);
    const autoDetectLanguage = useUserSettingsStore(
      (state) => state.autoDetectLanguage
    );
    const editorShowLineNumbers = useUserSettingsStore(
      (state) => state.editorShowLineNumbers
    );
    const editorPreferences = useUserSettingsStore((state) => state.editor);
    const presentational = useUserSettingsStore(
      (state) => state.presentational
    );
    const [lineNumbers, setLineNumbers] = useState<number[]>([]);

    //TODO: beautify and format the code according to the language

    useEffect(() => {
      const randomSnippet =
        codeSnippets[Math.floor(Math.random() * codeSnippets.length)];

      if (presentational) {
        return;
      }

      if (!hasUserEditedCode) {
        useUserSettingsStore.setState(randomSnippet);
      }
    }, [presentational, hasUserEditedCode]);

    useEffect(() => {
      if (autoDetectLanguage) {
        const { language: detecTedLanguage } = flourite(code, {
          noUnknown: true,
        });
        useUserSettingsStore.setState({
          language: detecTedLanguage.toLowerCase() || "plaintext",
        });
      }
    }, [autoDetectLanguage, code]);

    useEffect(() => {
      const lines = code.split("\n").length;
      setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
    }, [code]);

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

    //TODO: adding tabs and open new clean editor view

    return (
      <>
        <div
          className={cn(
            S.background(),
            showBackground &&
              !presentational &&
              themes[backgroundTheme].background
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
                      style={{ lineHeight: fontSize * 1.7 + "px" }}
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
                        useUserSettingsStore.setState({
                          hasUserEditedCode: true,
                        });
                        useUserSettingsStore.setState({ code });
                      }}
                      disabled={presentational}
                      highlight={(code) =>
                        hljs.highlight(code, {
                          language: language || "plaintext",
                        }).value
                      }
                      style={{
                        fontFamily: fonts[fontFamily].name,
                        fontSize: fontSize,
                        lineHeight: fontSize * 1.7 + "px",
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
