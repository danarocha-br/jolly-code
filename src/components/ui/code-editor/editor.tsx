"use client";

import React, { forwardRef, useEffect, useState } from "react";
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
import { TitleInput } from "./title-input";
import { Button } from "../button";
import WidthMeasurement from "./width-measurement";
import * as S from "./styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";

type EditorProps = {
  padding: number;
  width: string;
  setWidth: (value: React.SetStateAction<string>) => void;
  showWidth: boolean;
};

export const Editor = forwardRef<any, EditorProps>(
  ({ padding, width, showWidth = false, setWidth }, ref) => {
    const { theme } = useTheme();
    const isDarkTheme = theme === "dark";
    const code = useUserSettingsStore((state) => state.code);
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
      useUserSettingsStore.setState(randomSnippet);
    }, []);

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

    //TODO: adding tabs and open new clean editor view

    return (
      <div
        className={cn(
          S.background(),
          showBackground && themes[backgroundTheme].background
        )}
        style={{ padding }}
        ref={ref}
        id="editor"
      >
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
                {editorShowLineNumbers ? (
                  <div
                    className={S.lineNumbers()}
                    style={{ lineHeight: fontSize * 1.7 + "px" }}
                  >
                    {lineNumbers.map((num) => (
                      <div key={num}>{num}</div>
                    ))}
                  </div>
                ) : null}

                <CodeEditor
                  className={S.editor({
                    showLineNumbers: editorShowLineNumbers,
                  })}
                  value={code}
                  onValueChange={(code) => {
                    useUserSettingsStore.setState({ code });
                  }}
                  disabled={presentational}
                  highlight={(code) =>
                    hljs.highlight(code, { language: language || "plaintext" })
                      .value
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
              </section>
            </TabsContent>

            <TabsContent value="password">
              Change your password here.
            </TabsContent>
          </Tabs>
        </div>

        <WidthMeasurement showWidth={showWidth} width={width} />

        <div
          className={cn(
            "transition-opacity w-fit mx-auto relative -mb-12",
            showWidth || width === "auto"
              ? "invisible opacity-0"
              : "visible opacity-100"
          )}
        >
          <Button
            size="sm"
            onClick={() => setWidth("auto")}
            variant="ghost"
            className={S.widthButton()}
          >
            <i className="ri-close-circle-fill mr-2" />
            Reset width
          </Button>
        </div>
      </div>
    );
  }
);

Editor.displayName = "Editor";
