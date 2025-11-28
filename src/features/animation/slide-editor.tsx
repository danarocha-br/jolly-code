"use client";
import React, { useState, useEffect } from "react";
import CodeEditor from "react-simple-code-editor";
import hljs from "highlight.js";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fonts } from "@/lib/fonts-options";
import { languages } from "@/lib/language-options";
import { themes } from "@/lib/themes-options";
import { useAnimationStore } from "@/app/store";
import { useEditorStore } from "@/app/store";

export const SlideEditor = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  
  const slides = useAnimationStore((state) => state.slides);
  const activeSlideIndex = useAnimationStore((state) => state.activeSlideIndex);
  const updateSlide = useAnimationStore((state) => state.updateSlide);

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const showBackground = useEditorStore((state) => state.showBackground);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const editorPreferences = useEditorStore((state) => state.editor);

  const activeSlide = slides[activeSlideIndex];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  if (!activeSlide) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No slide selected
      </div>
    );
  }

  return (
    <div
      className={cn(
        "transition-all ease-out rounded-[14px] relative mb-2",
        showBackground && themes[backgroundTheme!].background
      )}
      style={{ padding: 60 }}
    >
      <div
        className={cn(
          "lg:min-w-[320px] border-2 rounded-xl shadow-high brightness-100 overflow-hidden relative",
          isDarkTheme
            ? "dark:bg-[hsl(260deg,4%,6%)]/80 dark:border-[hsl(260deg,4%,10%)]"
            : "bg-background/90 border-[#E3DCD9]/60"
        )}
      >
        {/* Header with dots and slide info */}
        <header
          className={cn(
            "flex gap-3 items-center px-4 py-1",
            editorPreferences === "default"
              ? "bg-background/80 dark:bg-background/20"
              : "bg-transparent"
          )}
        >
          {/* Three dots */}
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

          {/* Slide controls in header */}
          <div className="flex items-center justify-center flex-1 gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-transparent">
            <Input
              value={activeSlide.title}
              onChange={(e) =>
                updateSlide(activeSlide.id, { title: e.target.value })
              }
              placeholder="Slide title"
              className="max-w-[200px] h-7 bg-transparent border-0 text-stone-500 dark:text-stone-400 text-sm font-medium focus-visible:ring-0"
            />
            <Select
              value={activeSlide.language}
              onValueChange={(value) =>
                updateSlide(activeSlide.id, { language: value })
              }
            >
              <SelectTrigger className="w-[140px] h-7 border-0 bg-transparent text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languages).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="1"
                max="10"
                value={activeSlide.duration}
                onChange={(e) =>
                  updateSlide(activeSlide.id, {
                    duration: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                  })
                }
                className="w-[50px] h-7 bg-transparent border-0 text-stone-500 dark:text-stone-400 text-xs focus-visible:ring-0"
              />
              <span className="text-xs text-stone-500 dark:text-stone-400">s</span>
            </div>
          </div>
        </header>

        {/* Code content */}
        <section
          className={cn(
            "px-4 py-4",
            isDarkTheme
              ? "brightness-110"
              : "text-stone-800 contrast-200 brightness-[0.65]"
          )}
        >
          <CodeEditor
            key={activeSlide.id}
            value={activeSlide.code}
            onValueChange={(code) =>
              updateSlide(activeSlide.id, { code })
            }
            highlight={(code) =>
              hljs.highlight(code, {
                language: activeSlide.language || "plaintext",
              }).value
            }
            padding={10}
            style={{
              fontFamily: fonts[fontFamily || "robotoMono"].name,
              fontSize: fontSize,
              lineHeight: (fontSize || 14) * 1.7 + "px",
            }}
            textareaClassName="focus:outline-none"
            placeholder="Write your code here..."
          />
        </section>
      </div>
    </div>
  );
};
