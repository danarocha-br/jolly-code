import { diffWordsWithSpace } from "diff";

export type Position = {
  x: number;
  y: number;
};

export type TokenEntity = {
  id: string;
  content: string;
  from: Position | null;
  to: Position | null;
  type: "kept" | "added" | "removed";
};

export function calculateTokenDiff(
  fromCode: string,
  toCode: string,
  lineHeight: number,
  charWidth: number
): TokenEntity[] {
  const changes = diffWordsWithSpace(fromCode, toCode);
  const entities: TokenEntity[] = [];

  let fromLine = 0;
  let fromCol = 0;
  let toLine = 0;
  let toCol = 0;

  let entityCounter = 0;

  const positionCounts = new Map<string, number>();

  changes.forEach((change) => {
    const content = change.value;
    const type = change.added ? "added" : change.removed ? "removed" : "kept";

    // We need to split content by newlines to correctly calculate positions
    // and to ensure we don't have tokens spanning multiple lines (which makes rendering hard)
    const lines = content.split(/(\r\n|\r|\n)/);

    lines.forEach((part) => {
      if (part === "\r\n" || part === "\r" || part === "\n") {
        // Newline character(s)
        // We don't render newlines, but we update positions
        if (type !== "added") {
          fromLine++;
          fromCol = 0;
        }
        if (type !== "removed") {
          toLine++;
          toCol = 0;
        }
        return;
      }

      if (part.length === 0) return;

      // For the text part, we create an entity
      // To make it even smoother, we could split by character, 
      // but word-level is usually good enough and better for performance.
      // However, for "realistic" typing effects, character level is best.
      // Let's try word level first, but maybe split if it's a long token?
      // Actually, Snappify often does character level. 
      // Let's split by character for maximum smoothness!
      const chars = part.split("");

      chars.forEach((char) => {
        const fromPosition =
          type !== "added"
            ? {
                x: fromCol * charWidth,
                y: fromLine * lineHeight,
                line: fromLine,
                col: fromCol,
              }
            : null;

        const toPosition =
          type !== "removed"
            ? {
                x: toCol * charWidth,
                y: toLine * lineHeight,
                line: toLine,
                col: toCol,
              }
            : null;

        // Stable-ish key based on position and occurrence to avoid collisions
        const keyPosition = toPosition || fromPosition;
        const keyBase = keyPosition
          ? `${type}-${keyPosition.line}-${keyPosition.col}`
          : `token-${entityCounter++}`;
        const occurrence = positionCounts.get(keyBase) ?? 0;
        positionCounts.set(keyBase, occurrence + 1);

        const entity: TokenEntity = {
          id: `${keyBase}-${occurrence}`,
          content: char,
          from: fromPosition
            ? {
                x: fromPosition.x,
                y: fromPosition.y,
              }
            : null,
          to: toPosition
            ? {
                x: toPosition.x,
                y: toPosition.y,
              }
            : null,
          type,
        };

        if (type !== "added") {
          fromCol++;
        }

        if (type !== "removed") {
          toCol++;
        }

        entities.push(entity);
      });
    });
  });

  return entities;
}
