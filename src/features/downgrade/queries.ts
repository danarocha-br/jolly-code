import { useQuery } from "@tanstack/react-query";
import { getSnippetsMetadata } from "@/actions/snippets/get-snippets";
import { getAnimationsMetadata } from "@/actions/animations/get-animations";
import { checkDowngradeImpact } from "@/actions/downgrade/check-downgrade-impact";
import type { Snippet } from "@/features/snippets/dtos";
import type { Animation } from "@/features/animations/dtos";
import type { DowngradeImpact } from "@/lib/utils/downgrade-impact";
import type { PlanId } from "@/lib/config/plans";

// Metadata types matching the return types from getSnippetsMetadata/getAnimationsMetadata
export type SnippetMetadata = Pick<Snippet, "id" | "title" | "created_at" | "language">;
export type AnimationMetadata = Pick<Animation, "id" | "title" | "created_at">;

// Query keys
export const SNIPPETS_FOR_DOWNGRADE_KEY = "snippets-for-downgrade";
export const ANIMATIONS_FOR_DOWNGRADE_KEY = "animations-for-downgrade";
export const SNIPPET_COLLECTIONS_FOR_DOWNGRADE_KEY = "snippet-collections-for-downgrade";
export const ANIMATION_COLLECTIONS_FOR_DOWNGRADE_KEY = "animation-collections-for-downgrade";

// Query functions
import { getCollections } from "@/actions/collections/get-collections";
import { getAnimationCollections } from "@/actions/animations/get-collections";
import type { Collection } from "@/features/snippets/dtos";
import type { AnimationCollection } from "@/features/animations/dtos";

export const fetchSnippetsForDowngrade = async (): Promise<SnippetMetadata[]> => {
  const result = await getSnippetsMetadata();
  if (result.error || !result.data) return [];
  return result.data;
};

export const fetchAnimationsForDowngrade = async (): Promise<AnimationMetadata[]> => {
  const result = await getAnimationsMetadata();
  if (result.error || !result.data) return [];
  return result.data;
};

export const fetchSnippetCollectionsForDowngrade = async (): Promise<Collection[]> => {
  const result = await getCollections();
  if (result.error) {
    throw new Error(result.error);
  }
  return result.data || [];
};

export const fetchAnimationCollectionsForDowngrade = async (): Promise<AnimationCollection[]> => {
  const result = await getAnimationCollections();
  if (result.error) {
    throw new Error(result.error);
  }
  return result.data || [];
};

export const fetchDowngradeImpact = async (targetPlan?: PlanId): Promise<DowngradeImpact | null> => {
  if (!targetPlan) return null;

  const result = await checkDowngradeImpact(targetPlan);
  if (result.error) {
    throw new Error(result.error);
  }
  return result.data || null;
};

// React Query hooks
export const useSnippetsForDowngrade = (userId?: string, hasSnippetImpact?: boolean) => {
  return useQuery<SnippetMetadata[]>({
    queryKey: [SNIPPETS_FOR_DOWNGRADE_KEY, userId],
    queryFn: () => fetchSnippetsForDowngrade(),
    enabled: !!userId && !!hasSnippetImpact,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useAnimationsForDowngrade = (userId?: string, hasAnimationImpact?: boolean) => {
  return useQuery<AnimationMetadata[]>({
    queryKey: [ANIMATIONS_FOR_DOWNGRADE_KEY, userId],
    queryFn: () => fetchAnimationsForDowngrade(),
    enabled: !!userId && !!hasAnimationImpact,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useSnippetCollectionsForDowngrade = (userId?: string, hasFolderImpact?: boolean) => {
  return useQuery<Collection[]>({
    queryKey: [SNIPPET_COLLECTIONS_FOR_DOWNGRADE_KEY, userId],
    queryFn: () => fetchSnippetCollectionsForDowngrade(),
    enabled: !!userId && !!hasFolderImpact,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useAnimationCollectionsForDowngrade = (userId?: string, hasFolderImpact?: boolean) => {
  return useQuery<AnimationCollection[]>({
    queryKey: [ANIMATION_COLLECTIONS_FOR_DOWNGRADE_KEY, userId],
    queryFn: () => fetchAnimationCollectionsForDowngrade(),
    enabled: !!userId && !!hasFolderImpact,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useDowngradeImpact = (targetPlan?: PlanId, enabled: boolean = true) => {
  return useQuery<DowngradeImpact | null>({
    queryKey: ["downgrade-impact", targetPlan],
    queryFn: () => fetchDowngradeImpact(targetPlan),
    enabled: enabled && !!targetPlan,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
