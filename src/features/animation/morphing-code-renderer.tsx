"use client";
import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { fonts } from "@/lib/fonts-options";
import { themes } from "@/lib/themes-options";
import { useEditorStore } from "@/app/store";
import { calculateTokenDiff } from "./utils/token-diff";
import { generateColorMap } from "./utils/syntax-highlight";

type MorphingCodeRendererProps = {
  fromCode: string;
  toCode: string;
  fromTitle?: string;
  toTitle?: string;
  language: string;
  progress: number; // 0 to 1
  className?: string;
};

export const MorphingCodeRenderer = ({
  fromCode,
  toCode,
  fromTitle,
  toTitle,
  language,
  progress,
  className,
  chromeless = false,
}: MorphingCodeRendererProps & { chromeless?: boolean }) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const editorPreferences = useEditorStore((state) => state.editor);
  const fontSize = useEditorStore((state) => state.fontSize);

  // Default values if store is not ready
  const currentFontFamily = fontFamily || "robotoMono";
  const currentFontSize = fontSize || 14;
  const lineHeight = currentFontSize * 1.7;
  const estimatedCharWidth = currentFontSize * 0.6;
  const delayedProgress = Math.min(Math.max((progress - 0.05) / 0.9, 0), 1); // Hold initial frame briefly

  // Measure character width
  const [charWidth, setCharWidth] = React.useState(estimatedCharWidth);
  const measureRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const rect = measureRef.current?.getBoundingClientRect();
    const width = rect?.width && rect.width > 0 ? rect.width : estimatedCharWidth;
    setCharWidth(width);
  }, [currentFontFamily, currentFontSize, estimatedCharWidth]);

  // Generate color maps
  const fromColorMap = useMemo(() => generateColorMap(fromCode, language), [fromCode, language]);
  const toColorMap = useMemo(() => generateColorMap(toCode, language), [toCode, language]);

  // Calculate diff entities
  const entities = useMemo(() => {
    if (charWidth === 0) return [];
    return calculateTokenDiff(fromCode, toCode, lineHeight, charWidth);
  }, [fromCode, toCode, lineHeight, charWidth]);

  // Determine container height
  const fromLines = fromCode.split("\n").length;
  const toLines = toCode.split("\n").length;
  const containerHeight = (fromLines + (toLines - fromLines) * delayedProgress) * lineHeight;

  const content = (
    <div
      className="relative w-full h-full"
      style={{
        fontFamily: fonts[currentFontFamily].name,
        fontSize: currentFontSize,
        lineHeight: `${lineHeight}px`,
      }}
    >
      {/* Hidden measurement span */}
      <span
        ref={measureRef}
        className="opacity-0 absolute pointer-events-none"
        aria-hidden="true"
      >
        M
      </span>

      {entities.map((entity) => {
        let left = 0;
        let top = 0;
        let opacity = 1;
        let scale = 1;
        let filter = "none";
        let colorClass = "";

        if (entity.type === "kept" && entity.from && entity.to) {
          // Move from old to new position
          left = entity.from.x + (entity.to.x - entity.from.x) * delayedProgress;
          top = entity.from.y + (entity.to.y - entity.from.y) * delayedProgress;
          // Delay the color swap to avoid flicker at transition start
          const colorBlend = Math.min(Math.max((progress - 0.25) / 0.5, 0), 1);
          const fromColIndex = Math.round(entity.from.x / charWidth);
          const fromLineIndex = Math.round(entity.from.y / lineHeight);
          const toColIndex = Math.round(entity.to.x / charWidth);
          const toLineIndex = Math.round(entity.to.y / lineHeight);
          const fromColor = fromColorMap[`${fromLineIndex}-${fromColIndex}`] || "";
          const toColor = toColorMap[`${toLineIndex}-${toColIndex}`] || "";
          colorClass = colorBlend < 0.5 ? fromColor : toColor;
        } else if (entity.type === "removed" && entity.from) {
          // Fade out at old position
          left = entity.from.x;
          top = entity.from.y;
          opacity = 1 - delayedProgress;
          scale = 1 - delayedProgress * 0.2;
          filter = `blur(${delayedProgress * 2}px)`;
          // Use source color
          const colIndex = Math.round(entity.from.x / charWidth);
          const lineIndex = Math.round(entity.from.y / lineHeight);
          colorClass = fromColorMap[`${lineIndex}-${colIndex}`] || "";
        } else if (entity.type === "added" && entity.to) {
          // Fade in at new position
          left = entity.to.x;
          top = entity.to.y;
          opacity = delayedProgress;
          scale = 0.8 + delayedProgress * 0.2;
          filter = `blur(${(1 - delayedProgress) * 2}px)`;
          // Use destination color
          const colIndex = Math.round(entity.to.x / charWidth);
          const lineIndex = Math.round(entity.to.y / lineHeight);
          colorClass = toColorMap[`${lineIndex}-${colIndex}`] || "";
        }

        return (
          <span
            key={entity.id}
            className={cn("absolute whitespace-pre", colorClass)}
            style={{
              opacity,
              transform: `translate3d(${left}px, ${top}px, 0) scale(${scale})`,
              filter,
              transition: 'transform 33ms linear, opacity 33ms linear, filter 33ms linear', // Smooth transition between frames
              willChange: 'transform, opacity, filter', // Optimize for animation
            }}
          >
            {entity.content}
          </span>
        );
      })}
    </div>
  );

  if (chromeless) {
    return (
      <div style={{ height: containerHeight + 40 }} className="relative">
        {content}
      </div>
    );
  }

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
            "flex gap-3 items-center px-4 py-1 shrink-0 relative",
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

          {/* Title Cross-fade */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-stone-500 dark:text-stone-400 text-sm font-medium absolute transition-opacity duration-75"
              style={{ opacity: 1 - progress }}
            >
              {fromTitle || '\u00A0'}
            </span>
            <span
              className="text-stone-500 dark:text-stone-400 text-sm font-medium absolute transition-opacity duration-75"
              style={{ opacity: progress }}
            >
              {toTitle || '\u00A0'}
            </span>
          </div>
        </header>

        {/* Code content area */}
        <section
          className={cn(
            "px-4 py-4 relative",
            isDarkTheme
              ? "brightness-110"
              : "text-stone-800 contrast-200 brightness-[0.65]"
          )}
          style={{
            height: containerHeight + 40, // Add padding
          }}
        >
          {content}
        </section>
      </div>
    </div>
  );
};
