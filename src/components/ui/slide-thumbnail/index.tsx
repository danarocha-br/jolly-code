"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { themes, ThemeProps } from "@/lib/themes-options";
import * as S from "./styles";

type SlideThumbnailProps = {
  index: number;
  code: string;
  title: string;
  duration: number | string;
  isActive: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onRemove: () => void;
  backgroundTheme: ThemeProps;
  dragAttributes?: React.HTMLAttributes<HTMLDivElement>;
  dragListeners?: Record<string, unknown>;
  isDragging?: boolean;
  setRef?: (el: HTMLDivElement | null) => void;
  style?: React.CSSProperties;
};

export const SlideThumbnail = React.memo(
  ({
    index,
    code,
    title,
    duration,
    isActive,
    canRemove,
    onSelect,
    onRemove,
    backgroundTheme,
    dragAttributes = {},
    dragListeners = {},
    isDragging = false,
    setRef,
    style,
  }: SlideThumbnailProps) => {
    return (
      <div
        ref={setRef}
        style={style}
        className={S.container({ active: isActive, dragging: isDragging })}
        role="button"
        tabIndex={0}
        aria-label={`Slide ${index + 1}${isActive ? " (active)" : ""}`}
        aria-pressed={isActive}
        {...dragAttributes}
        {...dragListeners}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className={S.body()}>
          <div className={S.header()}>
            <span className={S.slideLabel()}>
              Slide {index + 1}
            </span>
            {canRemove && (
              <Button
                size="icon"
                variant="ghost"
                className={S.removeButton()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label={`Remove slide ${index + 1}`}
              >
                <i className="ri-close-line text-sm" />
              </Button>
            )}
          </div>

          <div
            className={cn(S.preview(), themes[backgroundTheme].background)}
          >
            <div className={S.previewOverlay()} aria-hidden="true" />
            <pre className={S.previewCode()}>
              {code || "Empty slide"}
            </pre>
          </div>

          <div className={S.meta()}>
            <span className={S.duration()} aria-label={`Duration ${duration} seconds`}>
              {duration}s
            </span>
          </div>
        </div>


      </div>
    );
  }
);

SlideThumbnail.displayName = "SlideThumbnail";
