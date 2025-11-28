"use client";
import { useMemo } from "react";
import hljs from "highlight.js";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { fonts } from "@/lib/fonts-options";
import { themes } from "@/lib/themes-options";
import { useEditorStore } from "@/app/store";

type CodeRendererProps = {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
};

export const CodeRenderer = ({
  code,
  language,
  title,
  showLineNumbers = false,
  className,
  chromeless = false,
}: CodeRendererProps & { chromeless?: boolean }) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const editorPreferences = useEditorStore((state) => state.editor);

  const highlightedCode = useMemo(() => {
    try {
      return hljs.highlight(code, { language: language || "plaintext" }).value;
    } catch (e) {
      return hljs.highlight(code, { language: "plaintext" }).value;
    }
  }, [code, language]);

  const lineNumbers = useMemo(() => {
    const lines = code.split("\n").length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  }, [code]);

  const content = (
    <>
      {showLineNumbers && (
        <div
          className="text-sm text-foreground/40 dark:text-muted-foreground/40 absolute"
          style={{ lineHeight: (fontSize || 14) * 1.7 + "px" }}
        >
          {lineNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </div>
      )}

      <pre
        className={cn("overflow-auto", showLineNumbers && "ml-6")}
        style={{
          fontFamily: fonts[fontFamily || "robotoMono"].name,
          fontSize: fontSize,
          lineHeight: (fontSize || 14) * 1.7 + "px",
        }}
      >
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </>
  );

  if (chromeless) {
    return content;
  }

  // Legacy wrapper for backward compatibility or standalone usage
  return (
    <div
      className={cn(
        "rounded-[14px] relative overflow-hidden",
        themes[backgroundTheme!].background,
        className
      )}
    >
      <div
        className={cn(
          "lg:min-w-[320px] border-2 rounded-xl shadow-high overflow-hidden relative",
          isDarkTheme
            ? "dark:bg-[hsl(260deg,4%,6%)]/80 dark:border-[hsl(260deg,4%,10%)]"
            : "bg-background/90 border-[#E3DCD9]/60"
        )}
      >
        {/* Header */}
        <header
          className={cn(
            "flex gap-3 items-center px-4 py-1 relative",
            editorPreferences === "default"
              ? "bg-background/80 dark:bg-background/20"
              : "bg-transparent"
          )}
          style={{ height: '36px' }}
        >
          <div className="flex gap-1.5 z-10">
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

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-stone-500 dark:text-stone-400 text-sm font-medium">
              {title || '\u00A0'}
            </span>
          </div>
        </header>

        {/* Code content */}
        <section
          className={cn(
            "px-4 py-4 relative",
            isDarkTheme
              ? "brightness-110"
              : "text-stone-800 contrast-200 brightness-[0.65]"
          )}
        >
          {content}
        </section>
      </div>
    </div>
  );
};
