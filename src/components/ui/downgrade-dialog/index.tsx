"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPlanConfig, type PlanId } from "@/lib/config/plans";
import type { DowngradeImpact } from "@/lib/utils/downgrade-impact";
import { checkDowngradeImpact } from "@/actions/downgrade/check-downgrade-impact";
import { bulkDeleteSnippets } from "@/actions/downgrade/bulk-delete-snippets";
import { bulkDeleteAnimations } from "@/actions/downgrade/bulk-delete-animations";
import { getSnippets } from "@/actions/snippets/get-snippets";
import { getAnimations } from "@/actions/animations/get-animations";
import { createPortalSession } from "@/actions/stripe/checkout";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Snippet } from "@/features/snippets/dtos";
import type { Animation } from "@/features/animations/dtos";
import { USAGE_QUERY_KEY } from "@/features/user/queries";

type DowngradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanId;
  targetPlan?: PlanId;
  userId?: string;
};

const formatLimit = (count: number | null) => {
  if (count === null || count === Infinity) return "Unlimited";
  return `${count}`;
};

const ImpactRow = ({
  label,
  current,
  max,
  overLimit,
  willBeOverLimit,
}: {
  label: string;
  current: number;
  max: number | null;
  overLimit: number;
  willBeOverLimit: boolean;
}) => {
  if (!willBeOverLimit) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-3">
      <div className="flex items-center gap-2">
        <i className="ri-error-warning-line text-destructive" />
        <span className="text-sm font-medium text-destructive">{label}</span>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-destructive">
          {current} / {formatLimit(max)}
        </p>
        <p className="text-xs text-destructive/80">{overLimit} over limit</p>
      </div>
    </div>
  );
};

export function DowngradeDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  userId,
}: DowngradeDialogProps) {
  const [impact, setImpact] = useState<DowngradeImpact | null>(null);
  const [selectedSnippets, setSelectedSnippets] = useState<Set<string>>(
    new Set()
  );
  const [selectedAnimations, setSelectedAnimations] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isProceeding, startProceedTransition] = useTransition();
  const [isLoadingImpactTransition, startLoadingImpactTransition] =
    useTransition();
  const [deletionCompleted, setDeletionCompleted] = useState(false);
  const queryClient = useQueryClient();
  const hasAutoSelectedSnippets = useRef(false);
  const hasAutoSelectedAnimations = useRef(false);

  // Fetch snippets and animations for management
  // Only fetch when dialog is open AND impact is loaded AND there's an over-limit issue
  const { data: snippets, isLoading: isLoadingSnippets } = useQuery<Snippet[]>({
    queryKey: ["snippets-for-downgrade", userId],
    queryFn: async () => {
      const result = await getSnippets();
      if (result.error || !result.data) return [];
      return result.data;
    },
    enabled: open && !!userId && !!impact && impact.snippets.willBeOverLimit,
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const { data: animations, isLoading: isLoadingAnimations } = useQuery<
    Animation[]
  >({
    queryKey: ["animations-for-downgrade", userId],
    queryFn: async () => {
      const result = await getAnimations();
      if (result.error || !result.data) return [];
      return result.data;
    },
    enabled: open && !!userId && !!impact && impact.animations.willBeOverLimit,
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      startLoadingImpactTransition(() => {
        setImpact(null);
        setSelectedSnippets(new Set());
        setSelectedAnimations(new Set());
        setDeletionCompleted(false);
      });
      hasAutoSelectedSnippets.current = false;
      hasAutoSelectedAnimations.current = false;
    }
  }, [open]);

  // Load impact when dialog opens
  useEffect(() => {
    if (!open || !userId) {
      return;
    }

    let cancelled = false;

    // Load impact asynchronously
    setIsLoadingImpact(true);

    checkDowngradeImpact(targetPlan)
      .then((result) => {
        if (cancelled) return;

        if (result.error) {
          toast.error(result.error);
          onOpenChange(false);
          return;
        }
        if (result.data) {
          startLoadingImpactTransition(() => {
            setImpact(result.data);
            setDeletionCompleted(false); // Reset flag when loading new impact
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error loading downgrade impact:", err);
        toast.error("Failed to load downgrade impact");
      })
      .finally(() => {
        if (!cancelled) {
          startLoadingImpactTransition(() => {
            setIsLoadingImpact(false);
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId, targetPlan, onOpenChange, startLoadingImpactTransition]);

  // Pre-select excess items when snippets/animations are loaded
  // Only auto-select once when data is first loaded
  useEffect(() => {
    if (
      impact &&
      snippets &&
      impact.snippets.willBeOverLimit &&
      !hasAutoSelectedSnippets.current
    ) {
      const excessCount = impact.snippets.overLimit;
      const sortedSnippets = [...snippets].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
      const toSelect = sortedSnippets
        .slice(0, Math.min(excessCount, sortedSnippets.length))
        .map((s) => s.id);
      startLoadingImpactTransition(() => {
        setSelectedSnippets(new Set(toSelect));
      });
      hasAutoSelectedSnippets.current = true;
    }
  }, [impact, snippets, startLoadingImpactTransition]);

  useEffect(() => {
    if (
      impact &&
      animations &&
      impact.animations.willBeOverLimit &&
      !hasAutoSelectedAnimations.current
    ) {
      const excessCount = impact.animations.overLimit;
      const sortedAnimations = [...animations].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
      const toSelect = sortedAnimations
        .slice(0, Math.min(excessCount, sortedAnimations.length))
        .map((a) => a.id);
      startLoadingImpactTransition(() => {
        setSelectedAnimations(new Set(toSelect));
      });
      hasAutoSelectedAnimations.current = true;
    }
  }, [impact, animations, startLoadingImpactTransition]);

  const handleDeleteSelected = () => {
    if (selectedSnippets.size === 0 && selectedAnimations.size === 0) {
      toast.error("Please select items to delete");
      return;
    }

    startDeleteTransition(async () => {
      try {
        const promises: Promise<any>[] = [];

        if (selectedSnippets.size > 0) {
          promises.push(
            bulkDeleteSnippets(Array.from(selectedSnippets)).then((result) => {
              if (result.error) {
                toast.error(result.error);
                throw new Error(result.error);
              }
              toast.success(
                `Deleted ${result.data?.deletedCount || 0} snippet(s)`
              );
            })
          );
        }

        if (selectedAnimations.size > 0) {
          promises.push(
            bulkDeleteAnimations(Array.from(selectedAnimations)).then(
              (result) => {
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(
                  `Deleted ${result.data?.deletedCount || 0} animation(s)`
                );
              }
            )
          );
        }

        await Promise.all(promises);

        // Mark deletion as completed successfully
        setDeletionCompleted(true);

        // Batch invalidate queries for better performance
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["snippets-for-downgrade", userId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["animations-for-downgrade", userId],
          }),
          queryClient.invalidateQueries({ queryKey: ["collections"] }),
          queryClient.invalidateQueries({
            queryKey: ["animation-collections"],
          }),
          userId
            ? queryClient.invalidateQueries({
                queryKey: [USAGE_QUERY_KEY, userId],
              })
            : Promise.resolve(),
        ]);

        // Re-check impact after deletion to update UI
        try {
          const newImpact = await checkDowngradeImpact(targetPlan);
          if (newImpact.data) {
            setImpact(newImpact.data);
            // Clear selections if impact is resolved
            if (!newImpact.data.hasAnyImpact) {
              setSelectedSnippets(new Set());
              setSelectedAnimations(new Set());
              // Reset flag since impact is now resolved
              setDeletionCompleted(false);
            }
          } else if (newImpact.error) {
            console.warn(
              "Failed to re-check impact after deletion:",
              newImpact.error
            );
            // Still clear selections to allow user to proceed
            // deletionCompleted flag remains true to allow proceeding
            setSelectedSnippets(new Set());
            setSelectedAnimations(new Set());
          }
        } catch (err) {
          console.error("Error re-checking impact:", err);
          // Clear selections anyway to allow user to proceed
          // deletionCompleted flag remains true to allow proceeding
          setSelectedSnippets(new Set());
          setSelectedAnimations(new Set());
        }
      } catch (error) {
        console.error("Error deleting items:", error);
        toast.error("Failed to delete items");
      }
    });
  };

  const handleProceedToDowngrade = () => {
    if (!impact) {
      toast.error("Please wait for impact calculation to complete");
      return;
    }

    // If deletions were completed successfully, allow proceeding even if impact re-check failed
    if (deletionCompleted) {
      // Deletions were successful, proceed to downgrade
      // The impact state may be stale, but we trust that deletions resolved the issue
    } else if (impact.hasAnyImpact) {
      // Check if user has resolved all over-limit issues
      // Note: After deletion, impact is re-checked, so we validate against current impact state
      const hasUnresolvedSnippets =
        impact.snippets.willBeOverLimit &&
        selectedSnippets.size < impact.snippets.overLimit;
      const hasUnresolvedAnimations =
        impact.animations.willBeOverLimit &&
        selectedAnimations.size < impact.animations.overLimit;

      if (hasUnresolvedSnippets || hasUnresolvedAnimations) {
        toast.error(
          "Please delete all excess items before proceeding. Select and delete items that exceed the limit."
        );
        return;
      }
    }

    startProceedTransition(async () => {
      try {
        // Open Stripe customer portal for downgrade
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

  const currentPlanConfig = getPlanConfig(currentPlan);
  const targetPlanConfig = impact ? getPlanConfig(impact.targetPlan) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <Badge variant="outline" className="w-fit mb-2">
            Downgrade Plan
          </Badge>
          <DialogTitle>
            Downgrade to {targetPlanConfig?.name || "Lower Plan"}
          </DialogTitle>
          <DialogDescription>
            Review the impact of downgrading and manage your content before
            proceeding
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {isLoadingImpact ? (
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            ) : impact ? (
              <>
                {impact.hasAnyImpact && (
                  <Alert variant="destructive">
                    <i className="ri-alert-line" />
                    <AlertTitle>Content Over Limit</AlertTitle>
                    <AlertDescription>
                      Your current usage exceeds the limits of the{" "}
                      {targetPlanConfig?.name} plan. You&apos;ll need to delete
                      or archive excess items before downgrading.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Impact Summary</h3>
                  <ImpactRow
                    label="Snippets"
                    current={impact.snippets.current}
                    max={impact.snippets.max}
                    overLimit={impact.snippets.overLimit}
                    willBeOverLimit={impact.snippets.willBeOverLimit}
                  />
                  <ImpactRow
                    label="Animations"
                    current={impact.animations.current}
                    max={impact.animations.max}
                    overLimit={impact.animations.overLimit}
                    willBeOverLimit={impact.animations.willBeOverLimit}
                  />
                  <ImpactRow
                    label="Folders"
                    current={impact.folders.current}
                    max={impact.folders.max}
                    overLimit={impact.folders.overLimit}
                    willBeOverLimit={impact.folders.willBeOverLimit}
                  />
                  <ImpactRow
                    label="Video Exports"
                    current={impact.videoExports.current}
                    max={impact.videoExports.max}
                    overLimit={impact.videoExports.overLimit}
                    willBeOverLimit={impact.videoExports.willBeOverLimit}
                  />
                  <ImpactRow
                    label="Public Shares"
                    current={impact.publicShares.current}
                    max={impact.publicShares.max}
                    overLimit={impact.publicShares.overLimit}
                    willBeOverLimit={impact.publicShares.willBeOverLimit}
                  />
                </div>

                {!impact.hasAnyImpact && (
                  <Alert>
                    <i className="ri-checkbox-circle-line text-success" />
                    <AlertTitle>No Impact</AlertTitle>
                    <AlertDescription>
                      Your current usage is within the limits of the{" "}
                      {targetPlanConfig?.name} plan. You can proceed with the
                      downgrade.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Item Management */}
                {(impact.snippets.willBeOverLimit ||
                  impact.animations.willBeOverLimit) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">
                        Manage Excess Items
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Select items to delete. We recommend deleting the oldest
                        items first.
                      </p>

                      {impact.snippets.willBeOverLimit && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Snippets ({selectedSnippets.size} of{" "}
                              {impact.snippets.overLimit} selected)
                            </p>
                            {selectedSnippets.size > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSnippets(new Set())}
                              >
                                Clear Selection
                              </Button>
                            )}
                          </div>
                          {isLoadingSnippets ? (
                            <div className="space-y-2">
                              <div className="h-10 w-full bg-muted animate-pulse rounded" />
                            </div>
                          ) : (
                            <ScrollArea className="h-48 border rounded-lg p-2">
                              <div className="space-y-2">
                                {!snippets || snippets.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No snippets found
                                  </p>
                                ) : (
                                  snippets.map((snippet) => (
                                    <div
                                      key={snippet.id}
                                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                                    >
                                      <Checkbox
                                        checked={selectedSnippets.has(
                                          snippet.id
                                        )}
                                        onCheckedChange={(checked) => {
                                          const newSet = new Set(
                                            selectedSnippets
                                          );
                                          if (checked) {
                                            newSet.add(snippet.id);
                                          } else {
                                            newSet.delete(snippet.id);
                                          }
                                          setSelectedSnippets(newSet);
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {snippet.title || "Untitled"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {snippet.language} •{" "}
                                          {new Date(
                                            snippet.created_at || 0
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      )}

                      {impact.animations.willBeOverLimit && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Animations ({selectedAnimations.size} of{" "}
                              {impact.animations.overLimit} selected)
                            </p>
                            {selectedAnimations.size > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedAnimations(new Set())}
                              >
                                Clear Selection
                              </Button>
                            )}
                          </div>
                          {isLoadingAnimations ? (
                            <div className="space-y-2">
                              <div className="h-10 w-full bg-muted animate-pulse rounded" />
                            </div>
                          ) : (
                            <ScrollArea className="h-48 border rounded-lg p-2">
                              <div className="space-y-2">
                                {!animations || animations.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No animations found
                                  </p>
                                ) : (
                                  animations.map((animation) => (
                                    <div
                                      key={animation.id}
                                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                                    >
                                      <Checkbox
                                        checked={selectedAnimations.has(
                                          animation.id
                                        )}
                                        onCheckedChange={(checked) => {
                                          const newSet = new Set(
                                            selectedAnimations
                                          );
                                          if (checked) {
                                            newSet.add(animation.id);
                                          } else {
                                            newSet.delete(animation.id);
                                          }
                                          setSelectedAnimations(newSet);
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {animation.title || "Untitled"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(
                                            animation.created_at || 0
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      )}

                      {(selectedSnippets.size > 0 ||
                        selectedAnimations.size > 0) && (
                        <Button
                          variant="destructive"
                          onClick={handleDeleteSelected}
                          disabled={isDeleting}
                          className="w-full"
                        >
                          {isDeleting ? (
                            <>
                              <i className="ri-loader-4-line text-lg mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <i className="ri-delete-bin-line text-lg mr-2" />
                              Delete Selected (
                              {selectedSnippets.size +
                                selectedAnimations.size}{" "}
                              items)
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* Comparison Table */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Plan Comparison</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Feature</th>
                          <th className="text-center p-3 font-medium">
                            {currentPlanConfig.name}
                          </th>
                          <th className="text-center p-3 font-medium">
                            {targetPlanConfig?.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-3">Snippets</td>
                          <td className="p-3 text-center">
                            {formatLimit(currentPlanConfig.maxSnippets)}
                          </td>
                          <td className="p-3 text-center">
                            {formatLimit(targetPlanConfig?.maxSnippets || 0)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Animations</td>
                          <td className="p-3 text-center">
                            {formatLimit(currentPlanConfig.maxAnimations)}
                          </td>
                          <td className="p-3 text-center">
                            {formatLimit(targetPlanConfig?.maxAnimations || 0)}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Slides per Animation</td>
                          <td className="p-3 text-center">
                            {formatLimit(
                              currentPlanConfig.maxSlidesPerAnimation
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {formatLimit(
                              targetPlanConfig?.maxSlidesPerAnimation || 0
                            )}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Folders</td>
                          <td className="p-3 text-center">
                            {formatLimit(currentPlanConfig.maxSnippetsFolder)}
                          </td>
                          <td className="p-3 text-center">
                            {formatLimit(
                              targetPlanConfig?.maxSnippetsFolder || 0
                            )}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Video Exports</td>
                          <td className="p-3 text-center">
                            {formatLimit(currentPlanConfig.maxVideoExportCount)}
                          </td>
                          <td className="p-3 text-center">
                            {formatLimit(
                              targetPlanConfig?.maxVideoExportCount || 0
                            )}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Public Shares</td>
                          <td className="p-3 text-center">
                            {formatLimit(currentPlanConfig.shareAsPublicURL)}
                          </td>
                          <td className="p-3 text-center">
                            {formatLimit(
                              targetPlanConfig?.shareAsPublicURL || 0
                            )}
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-3">Watermark Removal</td>
                          <td className="p-3 text-center">
                            {currentPlanConfig.removeWatermark ? (
                              <i className="ri-checkbox-circle-line text-success" />
                            ) : (
                              <i className="ri-close-circle-line text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {targetPlanConfig?.removeWatermark ? (
                              <i className="ri-checkbox-circle-line text-success" />
                            ) : (
                              <i className="ri-close-circle-line text-muted-foreground" />
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <i className="ri-loader-4-line text-2xl animate-spin mb-2" />
                <p>Loading downgrade impact...</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-3 pt-4 border-t">
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
                // Allow proceeding if deletions were completed successfully
                (!deletionCompleted &&
                  impact.hasAnyImpact &&
                  ((impact.snippets.willBeOverLimit &&
                    selectedSnippets.size < impact.snippets.overLimit) ||
                    (impact.animations.willBeOverLimit &&
                      selectedAnimations.size < impact.animations.overLimit)))
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
                  <i className="ri-external-link-line text-lg mr-2" />
                  Proceed to Downgrade
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
