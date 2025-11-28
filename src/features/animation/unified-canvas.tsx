import React, { useState, useEffect, useMemo } from "react";
import CodeEditor from "react-simple-code-editor";
import hljs from "highlight.js";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimationContainer, WindowChrome } from "./layout-components";
import { useAnimationStore, useEditorStore } from "@/app/store";
import { languages } from "@/lib/language-options";
import { fonts } from "@/lib/fonts-options";
import { AnimationFrame } from "./animator";
import { DiffTransitionFrame } from "./transitions/diff-transition";
import { MorphingCodeRenderer } from "./morphing-code-renderer";

export interface UnifiedAnimationCanvasProps {
  mode: "edit" | "preview";
  currentFrame: AnimationFrame | null;
}

export const UnifiedAnimationCanvas = React.forwardRef<HTMLDivElement, UnifiedAnimationCanvasProps>(({ mode, currentFrame }, ref) => {
  const [isMounted, setIsMounted] = useState(false);

  // Store state
  const slides = useAnimationStore((state) => state.slides);
  const activeSlideIndex = useAnimationStore((state) => state.activeSlideIndex);
  const updateSlide = useAnimationStore((state) => state.updateSlide);
  const activeSlide = slides[activeSlideIndex];

  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Header Content
  const headerContent = useMemo(() => {
    if (!activeSlide) return null;

    if (mode === "edit") {
      return (
        <div className="flex items-center justify-center flex-1 gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-transparent">
          <Input
            value={activeSlide.title}
            onChange={(e) => updateSlide(activeSlide.id, { title: e.target.value })}
            placeholder="Slide title"
            className="max-w-[200px] h-7 bg-transparent border-0 text-stone-500 dark:text-stone-400 text-sm font-medium focus-visible:ring-0"
          />
          <Select
            value={activeSlide.language}
            onValueChange={(value) => updateSlide(activeSlide.id, { language: value })}
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
      );
    } else {
      // Preview Mode Header
      return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-stone-500 dark:text-stone-400 text-sm font-medium">
            {mode === 'preview' && !currentFrame ? slides[0]?.title : ''}
          </span>
        </div>
      );
    }
  }, [mode, activeSlide, updateSlide, currentFrame, slides]);

  if (!isMounted || !activeSlide) return null;

  // Render Content
  const renderContent = () => {
    if (mode === "edit") {
      return (
        <CodeEditor
          key={activeSlide.id}
          value={activeSlide.code}
          onValueChange={(code) => updateSlide(activeSlide.id, { code })}
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
