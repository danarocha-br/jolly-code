import { useState, useRef, useEffect, useTransition } from "react";
import type { DowngradeState, DowngradeActions } from "../dtos";
import type { Snippet } from "@/features/snippets/dtos";
import type { Animation } from "@/features/animations/dtos";
import type { DowngradeImpact } from "@/lib/utils/downgrade-impact";
import { selectOldestSnippetItems, selectOldestAnimationItems } from "../utils";

export const useDowngradeState = (
  open: boolean,
  userId?: string,
  targetPlan?: string
): DowngradeState & DowngradeActions => {
  const [impact, setImpact] = useState<DowngradeImpact | null>(null);
  const [selectedSnippets, setSelectedSnippets] = useState<Set<string>>(new Set());
  const [selectedAnimations, setSelectedAnimations] = useState<Set<string>>(new Set());
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isProceeding, startProceedTransition] = useTransition();
  const [deletionCompleted, setDeletionCompleted] = useState(false);
  const [impactStale, setImpactStale] = useState(false);
  const [isLoadingImpactTransition, startLoadingImpactTransition] = useTransition();

  const hasAutoSelectedSnippets = useRef(false);
  const hasAutoSelectedAnimations = useRef(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      startLoadingImpactTransition(() => {
        setImpact(null);
        setSelectedSnippets(new Set());
        setSelectedAnimations(new Set());
        setDeletionCompleted(false);
        setImpactStale(false);
      });
      hasAutoSelectedSnippets.current = false;
      hasAutoSelectedAnimations.current = false;
    }
  }, [open]);

  // Auto-select oldest items when data loads
  const autoSelectItems = (
    items: Snippet[] | Animation[],
    impact: DowngradeImpact,
    type: 'snippets' | 'animations',
    hasAutoSelected: React.MutableRefObject<boolean>
  ) => {
    if (hasAutoSelected.current) return;

    const impactData = type === 'snippets' ? impact.snippets : impact.animations;
    if (!impactData.willBeOverLimit) return;

    const toSelect = type === 'snippets'
      ? selectOldestSnippetItems(items as Snippet[], impactData.overLimit)
      : selectOldestAnimationItems(items as Animation[], impactData.overLimit);

    startLoadingImpactTransition(() => {
      if (type === 'snippets') {
        setSelectedSnippets(new Set(toSelect));
      } else {
        setSelectedAnimations(new Set(toSelect));
      }
    });

    hasAutoSelected.current = true;
  };

  const toggleSnippetSelection = (snippetId: string) => {
    const newSet = new Set(selectedSnippets);
    if (newSet.has(snippetId)) {
      newSet.delete(snippetId);
    } else {
      newSet.add(snippetId);
    }
    setSelectedSnippets(newSet);
  };

  const toggleAnimationSelection = (animationId: string) => {
    const newSet = new Set(selectedAnimations);
    if (newSet.has(animationId)) {
      newSet.delete(animationId);
    } else {
      newSet.add(animationId);
    }
    setSelectedAnimations(newSet);
  };

  const clearSnippetSelections = () => setSelectedSnippets(new Set());
  const clearAnimationSelections = () => setSelectedAnimations(new Set());

  return {
    // State
    impact,
    selectedSnippets,
    selectedAnimations,
    isLoadingImpact,
    isDeleting,
    isProceeding,
    deletionCompleted,
    impactStale,

    // Actions
    handleDeleteSelected: () => {
      // This will be implemented in the main component
      // since it requires external dependencies (actions, queries, etc.)
    },
    handleRefreshImpact: async () => {
      // This will be implemented in the main component
    },
    handleProceedToDowngrade: () => {
      // This will be implemented in the main component
    },
    toggleSnippetSelection,
    toggleAnimationSelection,
    clearSnippetSelections,
    clearAnimationSelections,
    setSelectedSnippets,
    setSelectedAnimations,
    setDeletionCompleted,
    setImpactStale,
    setImpact,
  };
};
