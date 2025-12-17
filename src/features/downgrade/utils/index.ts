import { USAGE_QUERY_KEY } from "@/features/user/queries";

export const formatLimit = (count: number | null) => {
  if (count === null || count === Infinity) return "Unlimited";
  return `${count}`;
};

export const sortItemsByDate = <T extends { created_at?: string | number }>(
  items: T[],
  descending: boolean = false
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return descending ? dateB - dateA : dateA - dateB;
  });
};

export const selectOldestItems = <T extends { id: string; created_at?: string | number }>(
  items: T[],
  count: number
): string[] => {
  const sortedItems = sortItemsByDate(items);
  return sortedItems.slice(0, Math.min(count, sortedItems.length)).map(item => item.id);
};

// Re-export generic function with semantic names
export const selectOldestSnippetItems = <T extends { id: string; created_at?: string | number }>(
  items: T[],
  count: number
): string[] => selectOldestItems(items, count);

export const selectOldestAnimationItems = <T extends { id: string; created_at?: string | number }>(
  items: T[],
  count: number
): string[] => selectOldestItems(items, count);

export const selectOldestFolderItems = <T extends { id: string; created_at?: string | number }>(
  items: T[],
  count: number
): string[] => selectOldestItems(items, count);

export const getQueryInvalidationKeys = (userId?: string) => [
  [USAGE_QUERY_KEY, userId],
  ["snippets-for-downgrade", userId],
  ["animations-for-downgrade", userId],
  ["snippet-collections-for-downgrade", userId],
  ["animation-collections-for-downgrade", userId],
  ["collections"],
  ["animation-collections"],
];
