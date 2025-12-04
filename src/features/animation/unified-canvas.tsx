import React, { useState, useMemo, useCallback, useEffect } from "react";
import CodeEditor from "react-simple-code-editor";
import hljs from "highlight.js";
import { AnimationContainer, WindowChrome } from "./layout-components";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import { languages, LanguageProps } from "@/lib/language-options";
import { fonts } from "@/lib/fonts-options";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimationFrame } from "./animator";
import { DiffTransitionFrame } from "./transitions/diff-transition";
import { MorphingCodeRenderer } from "./morphing-code-renderer";
import { TitleBarInput } from "@/components/ui/title-bar-input";
import { languagesLogos } from "@/lib/language-logos";
import flourite from "flourite";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { AnimationSlide } from "@/types/animation";
import { debounce } from "@/lib/utils/debounce";
import { trackAnimationEvent } from "@/features/animation/analytics";

export interface UnifiedAnimationCanvasProps {
  mode: "edit" | "preview";
  currentFrame: AnimationFrame | null;
  actionSlot?: React.ReactNode;
}

export const UnifiedAnimationCanvas = React.forwardRef<HTMLDivElement, UnifiedAnimationCanvasProps>(({ mode, currentFrame, actionSlot }, ref) => {
  const [isMounted] = useState(true);
  const [languageOpen, setLanguageOpen] = useState(false);

  // Store state
  const slides = useAnimationStore((state) => state.slides);
  const activeSlideIndex = useAnimationStore((state) => state.activeSlideIndex);
  const updateSlide = useAnimationStore((state) => state.updateSlide);
  const activeSlide = slides[activeSlideIndex];
  const user = useUserStore((state) => state.user);
  const trackSlideEdited = useMemo(
    () =>
      debounce((field: "code" | "title" | "language") => {
        trackAnimationEvent("animation_slide_edited", user, {
          field_changed: field,
          slide_index: activeSlideIndex,
        });
      }, 800),
    [activeSlideIndex, user]
  );

  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const editorPreferences = useEditorStore((state) => state.editor);
  const showLineNumbers = useEditorStore((state) => state.showLineNumbers);

  const languageOptions = useMemo(
    () => Object.entries(languages).map(([value, label]) => ({ value, label })),
    []
  );

  const detectLanguage = useCallback((codeValue: string) => {
    const { language } = flourite(codeValue, { noUnknown: true });
    return language?.toLowerCase() || "plaintext";
  }, []);

  // Auto-detect language on code changes when enabled (matches code editor behavior)
  useEffect(() => {
    if (!activeSlide) return;
    const autoDetectEnabled = activeSlide.autoDetectLanguage ?? true;
    if (!autoDetectEnabled) return;

    const detected = detectLanguage(activeSlide.code || "");
    if (detected && detected !== activeSlide.language) {
      updateSlide(activeSlide.id, { language: detected, autoDetectLanguage: true });
    }
  }, [
    activeSlide,
    activeSlide?.id,
    activeSlide?.code,
    activeSlide?.autoDetectLanguage,
    detectLanguage,
    updateSlide,
  ]);

  // Calculate line numbers for edit mode
  const lineNumbers = activeSlide?.code
    ? Array.from({ length: activeSlide.code.split("\n").length }, (_, i) => i + 1)
    : [];

  // Header Content
  const headerContent = (() => {
    if (!activeSlide) return null;
    const autoDetectEnabled = activeSlide.autoDetectLanguage ?? true;
    const detectedLabel =
      languages[activeSlide.language as LanguageProps] || activeSlide.language || "Auto Detect";
    const showMagic = autoDetectEnabled && !activeSlide.language;

    if (mode === "edit") {
      return (
        <div className="relative flex items-center justify-center flex-1 gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-transparent">
          <Tabs defaultValue="slide" className="-ml-12">
            <TabsList>
              <TabsTrigger value="slide" className="relative">
                <TitleBarInput
                  idKey={activeSlide.id}
                  value={activeSlide.title ?? "Untitled"}
                  onChange={(value) => {
                    updateSlide(activeSlide.id, { title: value });
                    trackSlideEdited("title");
                  }}
                  language={activeSlide.language}
                  editorPreferences={editorPreferences}
                  placeholder="Untitled"
                />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs absolute right-0"
              >
                <span className="flex items-center gap-2">
                  {autoDetectEnabled ? (
                    showMagic ? (
                      <i className="ri-magic-fill text-amber-500 text-base -ml-1" />
                    ) : (
                      <span className="scale-90 -ml-1">
                        {languagesLogos[activeSlide.language as LanguageProps]}
                      </span>
                    )
                  ) : (
                    <span className="scale-90 -ml-1">
                      {languagesLogos[activeSlide.language as LanguageProps]}
                    </span>
                  )}
                  <span className="truncate">{detectedLabel}</span>
                </span>
                <i className="ri-arrow-down-s-line text-sm ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search language..." />
                <CommandEmpty className="px-4">No language found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-accent scrollbar-corner-accent/40 scrollbar-track-accent/40">
                  <CommandItem
                    onSelect={() => {
                      const detected = detectLanguage(activeSlide.code);
                      updateSlide(activeSlide.id, {
                        autoDetectLanguage: true,
                        language: detected,
                      });
                      trackSlideEdited("language");
                      setLanguageOpen(false);
                    }}
                  >
                    <span className="mr-3">
                      <i className="ri-magic-fill text-amber-500 text-base" />
                    </span>
                    <span className="mr-auto">Auto Detect</span>
                    <i
                      className={cn(
                        "ri-checkbox-circle-fill mr-2 h-4 w-4",
                        autoDetectEnabled ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                  {languageOptions.map((language) => (
                    <CommandItem
                      key={language.value}
                      onSelect={() => {
                        updateSlide(activeSlide.id, {
                          language: language.value,
                          autoDetectLanguage: false,
                        });
                        trackSlideEdited("language");
                        setLanguageOpen(false);
                      }}
                    >
                      <span className="mr-3">
                        {languagesLogos[language.value as LanguageProps]}
                      </span>
                      <span className="mr-auto">{language.label}</span>
                      <i
                        className={cn(
                          "ri-checkbox-circle-fill mr-2 h-4 w-4",
                          activeSlide.language === language.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

        </div>
      );
    } else {
      // Preview Mode Header
      return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-stone-500 dark:text-stone-400 text-md font-medium">
            {mode === 'preview' && !currentFrame ? slides[0]?.title : ''}
          </span>
        </div>
      );
    }
  })();

  if (!isMounted || !activeSlide) return null;

  // Render Content
  const renderContent = () => {
    if (mode === "edit") {
      const autoDetectEnabled = activeSlide.autoDetectLanguage ?? true;
      return (
        <>
          {showLineNumbers && (
            <div
              className="text-sm text-foreground/40 dark:text-muted-foreground/40 absolute left-4 select-none"
              style={{
                lineHeight: (fontSize || 14) * 1.7 + "px",
                paddingTop: "10px" // Match CodeEditor padding
              }}
            >
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>
          )}
          <div className={cn(showLineNumbers && "ml-6")}>
            <CodeEditor
              key={activeSlide.id}
              value={activeSlide.code}
              onValueChange={(code) => {
                updateSlide(activeSlide.id, { code });
                trackSlideEdited("code");
              }}
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
          </div>
        </>
      );
    } else {
      // Preview Mode
      if (!currentFrame) {
        // Show first slide static
        return (
          <MorphingCodeRenderer
            fromCode={slides[0]?.code || ""}
            toCode={slides[0]?.code || ""}
            fromTitle={slides[0]?.title}
            toTitle={slides[0]?.title}
            language={slides[0]?.language || "plaintext"}
            progress={1}
            chromeless
          />
        );
      }

      if (currentFrame.type === "slide") {
        return (
          <MorphingCodeRenderer
            fromCode={currentFrame.currentSlide.code}
            toCode={currentFrame.currentSlide.code}
            fromTitle={currentFrame.currentSlide.title}
            toTitle={currentFrame.currentSlide.title}
            language={currentFrame.currentSlide.language}
            progress={1}
            chromeless
          />
        );
      }

      // Transition frame
      const frame = currentFrame.frame;
      if (!frame) return null;

      const diffFrame = frame as DiffTransitionFrame;
      return (
        <MorphingCodeRenderer
          fromCode={diffFrame.fromSlide.code}
          toCode={diffFrame.toSlide.code}
          fromTitle={diffFrame.fromSlide.title}
          toTitle={diffFrame.toSlide.title}
          language={diffFrame.toSlide.language}
          progress={diffFrame.progress}
          chromeless
        />
      );
    }
  };

  return (
    <div ref={ref} className="w-full flex flex-col items-center gap-6">
      <AnimationContainer className="p-[60px] flex flex-col items-center justify-center w-full max-w-3xl transition-all duration-300">
        {actionSlot ? (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="pointer-events-auto">{actionSlot}</div>
          </div>
        ) : null}
        <WindowChrome
          headerContent={headerContent}
          className="w-full"
        >
          {renderContent()}
        </WindowChrome>
      </AnimationContainer>
    </div>
  );
});

UnifiedAnimationCanvas.displayName = "UnifiedAnimationCanvas";
