import hljs from "highlight.js";

export type ColorMap = {
  [key: string]: string; // key is "line-col", value is class name or color
};

export function generateColorMap(code: string, language: string): ColorMap {
  const map: ColorMap = {};

  let highlightedHTML = "";
  try {
    highlightedHTML = hljs.highlight(code, { language: language || "plaintext" }).value;
  } catch (e) {
    highlightedHTML = hljs.highlight(code, { language: "plaintext" }).value;
  }

  // We need to parse the HTML and map characters to classes
  // Since we are in a browser environment, we can use DOMParser or a temporary element
  if (typeof window === "undefined") return map; // Server-side safety

  const div = document.createElement("div");
  div.innerHTML = highlightedHTML;

  let line = 0;
  let col = 0;

  function traverse(node: Node, currentClass: string) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === "\n") {
          line++;
          col = 0;
        } else {
          if (currentClass) {
            map[`${line}-${col}`] = currentClass;
          }
          col++;
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      // hljs classes are like "hljs-keyword", "hljs-title", etc.
      // We append to current class if needed, but usually hljs is flat or simple nesting
      // We'll just take the class of the span, or inherit if empty
      const nodeClass = element.className || currentClass;
      // Recursively traverse children
      element.childNodes.forEach((child) => traverse(child, nodeClass));
    }
  }

  div.childNodes.forEach((child) => traverse(child, ""));

  return map;
}

// Helper to extract the actual color from the class name
// This requires us to know the theme colors. 
// Alternatively, we can just apply the class name to the rendered span.
