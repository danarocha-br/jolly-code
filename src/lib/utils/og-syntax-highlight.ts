/**
 * Lightweight syntax highlighting for OG images in Edge Runtime
 * Uses simple pattern matching instead of highlight.js to minimize bundle size
 */

import { getThemeColors, type SyntaxColorMap } from "@/lib/og-theme-colors";

export type StyledSegment = {
  text: string;
  color: string;
};

/**
 * Ultra-minimal syntax highlighter for Edge Runtime
 * Only highlights strings and a few keywords to minimize bundle size
 */
function highlightWithPatterns(code: string, colors: SyntaxColorMap): StyledSegment[] {
  const segments: StyledSegment[] = [];
  let currentIndex = 0;
  
  // Minimal patterns - only strings and top keywords
  const stringRegex = /(["'`]).*?\1/g;
  const keywordRegex = /\b(const|let|function|return|import|export)\b/g;
  
  const matches: Array<{ index: number; length: number; color: string }> = [];
  
  // Match strings
  let match;
  while ((match = stringRegex.exec(code)) !== null) {
    matches.push({ index: match.index, length: match[0].length, color: colors.string });
  }
  
  // Match keywords
  while ((match = keywordRegex.exec(code)) !== null) {
    matches.push({ index: match.index, length: match[0].length, color: colors.keyword });
  }
  
  // Sort and build segments
  matches.sort((a, b) => a.index - b.index);
  
  for (const m of matches) {
    if (m.index >= currentIndex) {
      if (m.index > currentIndex) {
        segments.push({ text: code.substring(currentIndex, m.index), color: colors.base });
      }
      segments.push({ text: code.substring(m.index, m.index + m.length), color: m.color });
      currentIndex = m.index + m.length;
    }
  }
  
  if (currentIndex < code.length) {
    segments.push({ text: code.substring(currentIndex), color: colors.base });
  }
  
  return segments.length > 0 ? segments : [{ text: code, color: colors.base }];
}

/**
 * Highlight code for OG image generation
 * Returns an array of styled segments ready for rendering
 */
export function highlightCodeForOG(
  code: string,
  _language: string, // Unused but kept for API compatibility
  theme: string = "sublime"
): StyledSegment[] {
  const colors = getThemeColors(theme);
  return highlightWithPatterns(code, colors);
}

export type CodeLine = {
  segments: Array<{ text: string; color: string }>;
};

/**
 * Render styled segments as lines for ImageResponse
 * Satori doesn't handle newlines well, so we split into separate line elements
 */
export function renderStyledSegments(segments: StyledSegment[]): CodeLine[] {
  if (segments.length === 0) return [];

  const lines: CodeLine[] = [];
  let currentLine: Array<{ text: string; color: string }> = [];
  let currentSegment = { text: "", color: segments[0].color };

  for (const segment of segments) {
    // Split segment by newlines
    const parts = segment.text.split("\n");
    
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        // Push current segment to line if it has content
        if (currentSegment.text) {
          currentLine.push({ ...currentSegment });
          currentSegment = { text: "", color: segment.color };
        }
        // Push current line and start new line
        lines.push({ segments: currentLine });
        currentLine = [];
      }
      
      if (parts[i]) {
        // Add to current segment if same color
        if (currentSegment.color === segment.color) {
          currentSegment.text += parts[i];
        } else {
          // Push previous segment and start new one
          if (currentSegment.text) {
            currentLine.push({ ...currentSegment });
          }
          currentSegment = { text: parts[i], color: segment.color };
        }
      }
    }
  }

  // Push any remaining segment and line
  if (currentSegment.text) {
    currentLine.push(currentSegment);
  }
  if (currentLine.length > 0) {
    lines.push({ segments: currentLine });
  }

  return lines;
}

/**
 * Truncate code to fit in OG image (max lines and max characters per line)
 */
export function truncateCodeForOG(code: string, maxLines: number = 10, maxCharsPerLine: number = 80): string {
  const lines = code.split("\n");
  const truncatedLines = lines.slice(0, maxLines).map((line) => {
    if (line.length > maxCharsPerLine) {
      return line.substring(0, maxCharsPerLine - 3) + "...";
    }
    return line;
  });

  return truncatedLines.join("\n");
}
