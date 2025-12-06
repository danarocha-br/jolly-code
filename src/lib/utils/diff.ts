export type DiffLine = {
  line: string;
  lineNumber: number;
};

export type DiffResult = {
  added: DiffLine[];
  removed: DiffLine[];
  unchanged: DiffLine[];
};

/**
 * Computes a simple line-based diff between two code strings.
 * Uses longest common subsequence (LCS) algorithm.
 */
export function computeDiff(oldCode: string, newCode: string): DiffResult {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  const lcs = longestCommonSubsequence(oldLines, newLines);
  const lcsSet = new Set(lcs.map((item) => item.line + item.index));

  const result: DiffResult = {
    added: [],
    removed: [],
    unchanged: [],
  };

  // Find removed lines (in old but not in LCS)
  let oldIndex = 0;
  for (let i = 0; i < oldLines.length; i++) {
    const key = oldLines[i] + oldIndex;
    if (!lcsSet.has(key)) {
      result.removed.push({ line: oldLines[i], lineNumber: i + 1 });
    } else {
      oldIndex++;
    }
  }

  // Find added and unchanged lines
  let newIndex = 0;
  let lcsIndex = 0;
  for (let i = 0; i < newLines.length; i++) {
    if (
      lcsIndex < lcs.length &&
      newLines[i] === lcs[lcsIndex].line &&
      newIndex === lcs[lcsIndex].index
    ) {
      result.unchanged.push({ line: newLines[i], lineNumber: i + 1 });
      lcsIndex++;
      newIndex++;
    } else {
      result.added.push({ line: newLines[i], lineNumber: i + 1 });
    }
  }

  return result;
}

/**
 * Finds longest common subsequence between two arrays of strings.
 * Returns array of { line, index } pairs.
 */
function longestCommonSubsequence(
  arr1: string[],
  arr2: string[]
): { line: string; index: number }[] {
  const m = arr1.length;
  const n = arr2.length;

  // Create DP table
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: { line: string; index: number }[] = [];
  let i = m;
  let j = n;
  let index = 0;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift({ line: arr1[i - 1], index });
      index++;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}
