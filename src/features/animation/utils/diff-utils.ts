import { diffLines } from "diff";

export type LineEntity = {
  id: string;
  content: string;
  fromIndex: number | null; // 0-based index in the original code
  toIndex: number | null;   // 0-based index in the new code
};

export function calculateDiffEntities(oldCode: string, newCode: string): LineEntity[] {
  const changes = diffLines(oldCode, newCode, { newlineIsToken: false });
  const entities: LineEntity[] = [];

  let currentOriginalIndex = 0;
  let currentModifiedIndex = 0;

  changes.forEach((change) => {
    // diffLines returns a string value which might contain multiple lines
    // We need to split it, but be careful with the last newline
    const lines = change.value.split("\n");

    // If the last element is empty (because value ended with \n), remove it
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    if (change.added) {
      // Added lines
      lines.forEach((line, i) => {
        entities.push({
          id: `added-${currentModifiedIndex + i}`,
          content: line,
          fromIndex: null,
          toIndex: currentModifiedIndex + i,
        });
      });
      currentModifiedIndex += lines.length;
    } else if (change.removed) {
      // Removed lines
      lines.forEach((line, i) => {
        entities.push({
          id: `removed-${currentOriginalIndex + i}`,
          content: line,
          fromIndex: currentOriginalIndex + i,
          toIndex: null,
        });
      });
      currentOriginalIndex += lines.length;
    } else {
      // Unchanged lines
      lines.forEach((line, i) => {
        entities.push({
          id: `kept-${currentOriginalIndex + i}`, // Use original index for stability
          content: line,
          fromIndex: currentOriginalIndex + i,
          toIndex: currentModifiedIndex + i,
        });
      });
      currentOriginalIndex += lines.length;
      currentModifiedIndex += lines.length;
    }
  });

  return entities;
}
