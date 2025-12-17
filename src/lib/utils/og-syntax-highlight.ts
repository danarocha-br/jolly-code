/**
 * Syntax highlighting utility for OG images in Edge Runtime
 * Uses highlight.js to parse code and apply theme colors
 */

import hljs from "highlight.js";
import { getThemeColors, type SyntaxColorMap } from "@/lib/og-theme-colors";

export type StyledSegment = {
  text: string;
  color: string;
};

/**
 * Parse HTML string and extract text nodes with their class names
 * This is a simplified DOM parser for Edge Runtime
 */
function parseHighlightedHTML(html: string): Array<{ text: string; className: string }> {
  const segments: Array<{ text: string; className: string }> = [];
  
  // Simple regex-based parser for highlight.js HTML output
  // Format: <span class="hljs-keyword">const</span>
  // Using [\s\S] to match any character including newlines
  const spanRegex = /<span class="([^"]*)">([\s\S]*?)<\/span>/g;
  let lastIndex = 0;
  let match;

  while ((match = spanRegex.exec(html)) !== null) {
    // Add any plain text before this span
    if (match.index > lastIndex) {
      const plainText = html.substring(lastIndex, match.index);
      if (plainText) {
        // Decode HTML entities
        const decoded = plainText
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, "&");
        segments.push({ text: decoded, className: "" });
      }
    }

    // Add the styled span content
    const className = match[1];
    const content = match[2]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&");
    
    segments.push({ text: content, className });
    lastIndex = match.index + match[0].length;
  }

  // Add any remaining plain text
  if (lastIndex < html.length) {
    const remaining = html.substring(lastIndex);
    if (remaining) {
      const decoded = remaining
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&");
      segments.push({ text: decoded, className: "" });
    }
  }

  return segments;
}

/**
 * Map highlight.js class names to theme colors
 */
function mapClassToColor(className: string, colors: SyntaxColorMap): string {
  if (!className) return colors.base;

  // Handle multiple classes (e.g., "hljs-keyword hljs-built_in")
  const classes = className.split(" ");
  
  for (const cls of classes) {
    // Remove 'hljs-' prefix if present
    const cleanClass = cls.replace(/^hljs-/, "");
    
    // Map to color property
    switch (cleanClass) {
      case "keyword":
        return colors.keyword;
      case "string":
      case "char":
        return colors.string;
      case "comment":
      case "quote":
        return colors.comment;
      case "function":
      case "function_":
        return colors.function;
      case "number":
        return colors.number;
      case "title":
      case "class":
      case "section":
        return colors.title;
      case "params":
        return colors.params;
      case "built_in":
        return colors.built_in;
      case "literal":
      case "boolean":
        return colors.literal;
      case "attr":
      case "attribute":
        return colors.attr;
      case "variable":
      case "template-variable":
        return colors.variable;
      case "operator":
        return colors.operator;
      case "punctuation":
        return colors.punctuation;
      case "meta":
      case "meta-keyword":
        return colors.meta;
      case "tag":
        return colors.tag;
      case "name":
        return colors.name;
      case "property":
      case "prop":
        return colors.property;
      case "regexp":
        return colors.regexp;
      case "selector":
      case "selector-tag":
      case "selector-class":
      case "selector-id":
        return colors.selector;
      case "subst":
      case "template-tag":
        return colors.subst;
      case "symbol":
        return colors.symbol;
      case "type":
        return colors.type;
      case "deletion":
        return "#f14c4c";
      case "addition":
        return "#73c991";
      case "link":
        return colors.function;
      case "emphasis":
        return colors.base;
      case "strong":
        return colors.base;
      default:
        return colors.base;
    }
  }

  return colors.base;
}

/**
 * Highlight code for OG image generation
 * Returns an array of styled segments ready for rendering
 */
export function highlightCodeForOG(
  code: string,
  language: string,
  theme: string = "sublime"
): StyledSegment[] {
  // Get theme colors
  const colors = getThemeColors(theme);

  // Highlight the code
  let highlightedHTML: string;
  try {
    const result = hljs.highlight(code, { language: language || "plaintext" });
    highlightedHTML = result.value;
  } catch (e) {
    // Fallback to plaintext if language is not supported
    try {
      const result = hljs.highlight(code, { language: "plaintext" });
      highlightedHTML = result.value;
    } catch (fallbackError) {
      // If all else fails, return unstyled code
      return [{ text: code, color: colors.base }];
    }
  }

  // Parse the HTML to extract segments with classes
  const parsedSegments = parseHighlightedHTML(highlightedHTML);

  // Map classes to colors
  const styledSegments: StyledSegment[] = parsedSegments.map((segment) => ({
    text: segment.text,
    color: mapClassToColor(segment.className, colors),
  }));

  return styledSegments;
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

