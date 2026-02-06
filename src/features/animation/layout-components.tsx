"use client";
import React from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { themes } from "@/lib/themes-options";
import { useEditorStore } from "@/app/store";

type AnimationContainerProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const AnimationContainer = ({
  children,
  className,
  style,
}: AnimationContainerProps) => {
  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);

  return (
    <div
      className={cn(
        "rounded-[14px] relative overflow-hidden transition-colors duration-300",
        themes[backgroundTheme!].background,
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};

type WindowChromeProps = {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
};

export const WindowChrome = ({
  children,
  headerContent,
  className,
  contentClassName,
  contentStyle,
}: WindowChromeProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const editorPreferences = useEditorStore((state) => state.editor);

  return (
    <div
      className={cn(
        "lg:min-w-[320px] border-2 rounded-xl shadow-high overflow-hidden relative flex flex-col transition-colors duration-300",
        isDarkTheme
          ? "dark:bg-[hsl(260deg,4%,6%)]/80 dark:border-[hsl(260deg,4%,10%)]"
          : "bg-background/90 border-[#E3DCD9]/60",
        className
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "flex gap-3 items-center px-4 py-1 relative shrink-0",
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

        {headerContent}
      </header>

      {/* Content */}
      <section
        className={cn(
          "px-4 py-4 relative flex-1",
          isDarkTheme
            ? "brightness-110"
            : "text-stone-800 contrast-200 brightness-[0.65]",
          contentClassName
        )}
        style={{ ...contentStyle, letterSpacing: 0 }}
      >
        {children}
      </section>
    </div>
  );
};
