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
  chromeless?: boolean;
  scale?: number;
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
  scale = 1,
}: MorphingCodeRendererProps) => {
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
  const clamped = Math.min(Math.max(progress, 0), 1);
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const morphProgress = easeInOutCubic(clamped);

  // Measure character width
  const [charWidth, setCharWidth] = React.useState(estimatedCharWidth);
  const measureRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const rect = measureRef.current?.getBoundingClientRect();
    if (rect?.width && rect.width > 0) {
      setCharWidth(rect.width / scale);
    } else {
      setCharWidth(estimatedCharWidth);
    }
  }, [currentFontFamily, currentFontSize, estimatedCharWidth, scale]);

  // Generate color maps
  const fromColorMap = useMemo(() => generateColorMap(fromCode, language), [fromCode, language]);
  const toColorMap = useMemo(() => generateColorMap(toCode, language), [toCode, language]);

  // Calculate diff entities
  const entities = useMemo(() => {
    if (charWidth === 0) return [];
    return calculateTokenDiff(fromCode, toCode, lineHeight, charWidth);
  }, [fromCode, toCode, lineHeight, charWidth]);

  const fromLines = fromCode.split("\n").length;
  const toLines = toCode.split("\n").length;

  // Smoothly interpolate height between from and to slides
  const fromHeight = fromLines * lineHeight;
  const toHeight = toLines * lineHeight;
  const animatedHeight = fromHeight + (toHeight - fromHeight) * morphProgress;

  const heightStyle = React.useMemo(
    () => ({ minHeight: animatedHeight }),
    [animatedHeight]
  );

  // Keep tokens fully visible; only added/removed fade based on eased morph

  const content = (
    <div
      className="relative w-full"
      style={{
        ...heightStyle,
        fontFamily: fonts[currentFontFamily].name,
        fontSize: currentFontSize,
        lineHeight: `${lineHeight}px`,
        letterSpacing: 0,
        fontVariantLigatures: 'none',
        fontFeatureSettings: '"liga" 0, "calt" 0, "dlig" 0',
      }}
    >
      {/* Hidden measurement span */}
      <span
        ref={measureRef}
        className="opacity-0 absolute pointer-events-none"
        aria-hidden="true"
        style={{ letterSpacing: 0 }}
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
          // Move from old to new position after a short hold
          left = entity.from.x + (entity.to.x - entity.from.x) * morphProgress;
          top = entity.from.y + (entity.to.y - entity.from.y) * morphProgress;

          const fromColIndex = Math.round(entity.from.x / charWidth);
          const fromLineIndex = Math.round(entity.from.y / lineHeight);
          const toColIndex = Math.round(entity.to.x / charWidth);
          const toLineIndex = Math.round(entity.to.y / lineHeight);
          const fromColor = fromColorMap[`${fromLineIndex}-${fromColIndex}`] || "";
          const toColor = toColorMap[`${toLineIndex}-${toColIndex}`] || "";
          colorClass = morphProgress < 0.5 ? fromColor : toColor;
        } else if (entity.type === "removed" && entity.from) {
          // Fade out removed tokens with eased progress
          left = entity.from.x;
          top = entity.from.y;
          const effective = morphProgress;
          opacity = 1 - effective;
          scale = 1 - effective * 0.15;
          filter = `blur(${effective * 1.5}px)`;
          const colIndex = Math.round(entity.from.x / charWidth);
          const lineIndex = Math.round(entity.from.y / lineHeight);
          colorClass = fromColorMap[`${lineIndex}-${colIndex}`] || "";
        } else if (entity.type === "added" && entity.to) {
          // Fade in added tokens with eased progress
          left = entity.to.x;
          top = entity.to.y;
          const effective = morphProgress;
          opacity = effective;
          scale = 0.9 + effective * 0.1;
          filter = `blur(${(1 - effective) * 1.5}px)`;
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
              willChange: "transform, opacity, filter",
              letterSpacing: 0,
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
      <div className="relative" style={heightStyle}>
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
          style={heightStyle}
        >
          {content}
        </section>
      </div>
    </div>
  );
};
