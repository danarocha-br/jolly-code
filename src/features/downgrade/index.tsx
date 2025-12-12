"use client";

import { useState, useTransition, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiLoader4Line,
  RiRefreshLine,
} from "react-icons/ri";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { getPlanConfig } from "@/lib/config/plans";
import { checkDowngradeImpact } from "@/actions/downgrade/check-downgrade-impact";
import { bulkDeleteSnippets } from "@/actions/downgrade/bulk-delete-snippets";
import { bulkDeleteAnimations } from "@/actions/downgrade/bulk-delete-animations";
import { bulkDeleteSnippetCollections } from "@/actions/downgrade/bulk-delete-snippet-collections";
import { bulkDeleteAnimationCollections } from "@/actions/downgrade/bulk-delete-animation-collections";
import { createPortalSession } from "@/actions/stripe/checkout";
import {
  useSnippetsForDowngrade,
  useAnimationsForDowngrade,
  useSnippetCollectionsForDowngrade,
  useAnimationCollectionsForDowngrade,
  useDowngradeImpact,
} from "./queries";
import {
  getQueryInvalidationKeys,
  selectOldestSnippetItems,
  selectOldestAnimationItems,
  selectOldestFolderItems,
} from "./utils";
import { SnippetSelector, AnimationSelector, FolderSelector } from "./ui/item-selector";
import { ImpactSummary } from "./ui/impact-summary";
import { PlanComparison } from "./ui/plan-comparison";
import { DeleteButton } from "./ui/delete-button";
import type { DowngradeDialogProps } from "./dtos";
import { USAGE_QUERY_KEY } from "@/features/user/queries";

export function DowngradeFeature({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  userId,
}: DowngradeDialogProps) {
  const queryClient = useQueryClient();
  const [selectedSnippets, setSelectedSnippets] = useState<Set<string>>(
    new Set()
  );
  const [selectedAnimations, setSelectedAnimations] = useState<Set<string>>(
    new Set()
  );
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isProceeding, startProceedTransition] = useTransition();
  const [deletionCompleted, setDeletionCompleted] = useState(false);
  const [impactStale, setImpactStale] = useState(false);

  const hasAutoSelectedSnippets = useRef(false);
  const hasAutoSelectedAnimations = useRef(false);
  const hasAutoSelectedFolders = useRef(false);

  // Data fetching
  const {
    data: impact,
    isLoading: isLoadingImpact,
    error: impactError,
    refetch: refetchImpact,
  } = useDowngradeImpact(targetPlan, open && !!userId);

  const { data: snippets, isLoading: isLoadingSnippets } =
    useSnippetsForDowngrade(userId, impact?.snippets.willBeOverLimit);

  const { data: animations, isLoading: isLoadingAnimations } =
    useAnimationsForDowngrade(userId, impact?.animations.willBeOverLimit);

  // Fetch collections if folders are over limit
  const { data: snippetCollections, isLoading: isLoadingSnippetCollections } =
    useSnippetCollectionsForDowngrade(userId, impact?.folders.willBeOverLimit);

  const { data: animationCollections, isLoading: isLoadingAnimationCollections } =
    useAnimationCollectionsForDowngrade(userId, impact?.folders.willBeOverLimit);

  // Combine collections into a single "folders" list for display and selection
  const allFolders = useMemo(() => {
    const sCollections = snippetCollections || [];
    const aCollections = animationCollections || [];
    // We can map them to a common structure if needed, but they share id/title/created_at
    return [...sCollections, ...aCollections]
      .filter((item): item is typeof item & { id: string } => !!item.id)
      .map(item => ({
        id: item.id,
        title: item.title,
        created_at: item.created_at,
        // Tag them so we know which delete action to call
        type: (item as any).snippets ? 'snippet' : 'animation'
      }));
  }, [snippetCollections, animationCollections]);

  const isLoadingFolders = isLoadingSnippetCollections || isLoadingAnimationCollections;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedSnippets(new Set());
      setSelectedAnimations(new Set());
      setSelectedFolders(new Set());
      setDeletionCompleted(false);
      setImpactStale(false);
      hasAutoSelectedSnippets.current = false;
      hasAutoSelectedAnimations.current = false;
      hasAutoSelectedFolders.current = false;
    }
  }, [open]);

  // Handle impact loading error
  useEffect(() => {
    if (impactError) {
      toast.error(impactError.message);
      onOpenChange(false);
    }
  }, [impactError, onOpenChange]);

  // Auto-select oldest items when data loads
  useEffect(() => {
    if (
      impact &&
      snippets &&
      impact.snippets.willBeOverLimit &&
      !hasAutoSelectedSnippets.current
    ) {
      const toSelect = selectOldestSnippetItems(
        snippets,
        impact.snippets.overLimit
      );
      setSelectedSnippets(new Set(toSelect));
      hasAutoSelectedSnippets.current = true;
    }
  }, [impact, snippets]);

  useEffect(() => {
    if (
      impact &&
      animations &&
      impact.animations.willBeOverLimit &&
      !hasAutoSelectedAnimations.current
    ) {
      const toSelect = selectOldestAnimationItems(
        animations,
        impact.animations.overLimit
      );
      setSelectedAnimations(new Set(toSelect));
      hasAutoSelectedAnimations.current = true;
    }
  }, [impact, animations]);

  useEffect(() => {
    if (
      impact &&
      allFolders.length > 0 &&
      impact.folders.willBeOverLimit &&
      !hasAutoSelectedFolders.current
    ) {
      const toSelectIds = selectOldestFolderItems(
        allFolders,
        // Calculate total folder over limit from impact if available, or 0
        (impact.folders as any).overLimit || 0
      );
      setSelectedFolders(new Set(toSelectIds));
      hasAutoSelectedFolders.current = true;
    }
  }, [impact, allFolders]);

  const handleDeleteSelected = () => {
    if (selectedSnippets.size === 0 && selectedAnimations.size === 0 && selectedFolders.size === 0) {
      toast.error("Please select items to delete");
      return;
    }

    startDeleteTransition(async () => {
      try {
        const promises: Promise<any>[] = [];

        if (selectedSnippets.size > 0) {
          promises.push(
            bulkDeleteSnippets(Array.from(selectedSnippets)).then((result) => {
              if (result.error) throw new Error(result.error);
              toast.success(`Deleted ${result.data?.deletedCount || 0} snippet(s)`);
            })
          );
        }

        if (selectedAnimations.size > 0) {
          promises.push(
            bulkDeleteAnimations(Array.from(selectedAnimations)).then((result) => {
              if (result.error) throw new Error(result.error);
              toast.success(`Deleted ${result.data?.deletedCount || 0} animation(s)`);
            })
          );
        }

        if (selectedFolders.size > 0) {
          // Split selected folders by type
          const selectedSnippetCollectionIds: string[] = [];
          const selectedAnimationCollectionIds: string[] = [];

          const foldersMap = new Map(allFolders.map(f => [f.id, f.type]));

          selectedFolders.forEach(id => {
            const type = foldersMap.get(id);
            if (type === 'snippet') selectedSnippetCollectionIds.push(id);
            else if (type === 'animation') selectedAnimationCollectionIds.push(id);
          });

          if (selectedSnippetCollectionIds.length > 0) {
            promises.push(
              bulkDeleteSnippetCollections(selectedSnippetCollectionIds).then((result) => {
                if (result.error) throw new Error(result.error);
              })
            );
          }

          if (selectedAnimationCollectionIds.length > 0) {
            promises.push(
              bulkDeleteAnimationCollections(selectedAnimationCollectionIds).then((result) => {
                if (result.error) throw new Error(result.error);
              })
            );
          }

          // Add a generic toast for folders if any, aggregated
          if (selectedSnippetCollectionIds.length > 0 || selectedAnimationCollectionIds.length > 0) {
            promises.push(Promise.resolve().then(() => {
              const count = selectedSnippetCollectionIds.length + selectedAnimationCollectionIds.length;
              toast.success(`Deleted ${count} folder(s)`);
            }));
          }
        }

        await Promise.all(promises);
        setDeletionCompleted(true);

        // Invalidate queries
        const invalidationKeys = getQueryInvalidationKeys(userId);
        await Promise.all(
          invalidationKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          )
        );

        // Invalidate usage queries
        if (userId) {
          queryClient.invalidateQueries({
            queryKey: [USAGE_QUERY_KEY, userId],
          });
        }

        // Re-check impact after deletion
        if (targetPlan) {
          const newImpact = await checkDowngradeImpact(targetPlan);
          if (newImpact.data) {
            queryClient.setQueryData(
              ["downgrade-impact", targetPlan],
              newImpact.data
            );
            setImpactStale(false);
            // Clear selections if impact is resolved
            if (!newImpact.data.hasAnyImpact) {
              setSelectedSnippets(new Set());
              setSelectedAnimations(new Set());
              setSelectedFolders(new Set());
              setDeletionCompleted(false);
            }
          } else if (newImpact.error) {
            setImpactStale(true);
            setDeletionCompleted(false);
            setSelectedSnippets(new Set());
            setSelectedAnimations(new Set());
            setSelectedFolders(new Set());
            toast.warning(
              "Failed to refresh impact data. Please refresh before proceeding."
            );
          }
        }
      } catch (error) {
        console.error("Error deleting items:", error);
        toast.error("Failed to delete items");
      }
    });
  };

  const handleRefreshImpact = async () => {
    if (!targetPlan) return;
    setImpactStale(false);
    await refetchImpact();
    toast.success("Impact data refreshed");
  };

  const handleProceedToDowngrade = () => {
    if (!impact) {
      toast.error("Please wait for impact calculation to complete");
      return;
    }

    if (impactStale) {
      toast.error(
        "Impact data is stale. Please refresh the impact before proceeding."
      );
      return;
    }

    startProceedTransition(async () => {
      try {
        const result = await createPortalSession();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.url) {
          window.location.href = result.url;
        }
      } catch (error) {
        console.error("Error opening portal:", error);
        toast.error("Failed to open customer portal");
      }
    });
  };

  const toggleSnippetSelection = (snippetId: string) => {
    const newSet = new Set(selectedSnippets);
    if (newSet.has(snippetId)) newSet.delete(snippetId);
    else newSet.add(snippetId);
    setSelectedSnippets(newSet);
  };

  const toggleAnimationSelection = (animationId: string) => {
    const newSet = new Set(selectedAnimations);
    if (newSet.has(animationId)) newSet.delete(animationId);
    else newSet.add(animationId);
    setSelectedAnimations(newSet);
  };

  const toggleFolderSelection = (folderId: string) => {
    const newSet = new Set(selectedFolders);
    if (newSet.has(folderId)) newSet.delete(folderId);
    else newSet.add(folderId);
    setSelectedFolders(newSet);
  };

  const clearSnippetSelections = () => setSelectedSnippets(new Set());
  const clearAnimationSelections = () => setSelectedAnimations(new Set());
  const clearFolderSelections = () => setSelectedFolders(new Set());

  const currentPlanConfig = getPlanConfig(currentPlan);
  const targetPlanConfig = impact ? getPlanConfig(impact.targetPlan) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Downgrade to {targetPlanConfig?.name} plan</DialogTitle>
          <DialogDescription>
            Review the impact of downgrading and manage your content before
            proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-4 overflow-y-auto">
          <div className="space-y-6">
            {impactStale && (
              <Alert variant="destructive">
                <RiAlertLine className="size-4" />
                <AlertTitle>Impact data out of date</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>
                    We couldn&apos;t update your impact data after the recent
                    deletion. Please refresh the page to ensure you&apos;re
                    seeing the latest info before moving forward.
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRefreshImpact}
                    disabled={isLoadingImpact}
                    className="whitespace-nowrap"
                  >
                    {isLoadingImpact ? (
                      <>
                        <RiLoader4Line className="size-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RiRefreshLine className="size-4" />
                        Refresh impact
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {isLoadingImpact ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-card dark:bg-muted" />
                <Skeleton className="h-4 w-3/4 bg-card dark:bg-muted" />
              </div>
            ) : impact ? (
              <>
                {impact.hasAnyImpact && (
                  <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <RiAlertLine className="size-4" />
                    <AlertTitle>
                      Usage exceeds {targetPlanConfig?.name} plan limits
                    </AlertTitle>
                    <AlertDescription>
                      You will keep your data, but you won&apos;t be able to create new items
                      until you are under the limit. You can manage your items below
                      or do it later.
                    </AlertDescription>
                  </Alert>
                )}

                <ImpactSummary impact={impact} />

                {!impact.hasAnyImpact && (
                  <Alert>
                    <RiCheckboxCircleLine className="size-4 fill-success" />
                    <AlertTitle>You're good to go</AlertTitle>
                    <AlertDescription>
                      Your usage is within the {targetPlanConfig?.name} plan
                      limits. You can go ahead and downgrade anytime.
                    </AlertDescription>
                  </Alert>
                )}

                {(impact.snippets.willBeOverLimit ||
                  impact.animations.willBeOverLimit ||
                  impact.folders.willBeOverLimit) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          Manage excess items (Optional)
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          You can delete items now to stay under the limit, or keep them as read-only.
                        </p>

                        {impact.snippets.willBeOverLimit && snippets && (
                          <SnippetSelector
                            snippets={snippets}
                            selectedSnippets={selectedSnippets}
                            onToggleSelection={toggleSnippetSelection}
                            onClearSelection={clearSnippetSelections}
                            isLoading={isLoadingSnippets}
                          />
                        )}

                        {impact.animations.willBeOverLimit && animations && (
                          <AnimationSelector
                            animations={animations}
                            selectedAnimations={selectedAnimations}
                            onToggleSelection={toggleAnimationSelection}
                            onClearSelection={clearAnimationSelections}
                            isLoading={isLoadingAnimations}
                          />
                        )}

                        {impact.folders.willBeOverLimit && allFolders.length > 0 && (
                          <FolderSelector
                            folders={allFolders}
                            selectedFolders={selectedFolders}
                            onToggleSelection={toggleFolderSelection}
                            onClearSelection={clearFolderSelections}
                            isLoading={isLoadingFolders}
                          />
                        )}

                        <DeleteButton
                          selectedCount={
                            selectedSnippets.size + selectedAnimations.size + selectedFolders.size
                          }
                          isDeleting={isDeleting}
                          onDelete={handleDeleteSelected}
                        />
                      </div>
                    </>
                  )}

                <Separator />
                <PlanComparison
                  currentPlan={currentPlan}
                  targetPlan={impact.targetPlan}
                />
              </>
            ) : impactStale ? (
              <div className="text-center py-8 text-muted-foreground">
                <i className="ri-error-warning-line text-2xl mb-2 text-destructive" />
                <p className="font-medium mb-2">Impact data unavailable</p>
                <p className="text-sm">
                  Please refresh the impact data to see accurate information.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <i className="ri-loader-4-line text-2xl animate-spin mb-2" />
                <p>Loading downgrade impact...</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t px-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProceedToDowngrade}
              disabled={
                isProceeding ||
                isDeleting ||
                isLoadingImpact ||
                !impact ||
                impactStale
              }
              className="flex-1"
              variant="destructive"
            >
              {isProceeding ? (
                <>
                  <i className="ri-loader-4-line text-lg mr-2 animate-spin" />
                  Opening Portal...
                </>
              ) : (
                <>
                  Proceed to downgrade
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            You&apos;ll be redirected to Stripe Customer Portal to complete the
            downgrade
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
