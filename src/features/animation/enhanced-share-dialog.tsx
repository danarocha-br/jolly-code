"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import {
  AnimationSharePayload,
  encodeAnimationSharePayload,
  generateEmbedCode,
  generatePlatformUrl,
  generateSocialShareUrl,
} from "@/features/animation/share-utils";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { calculateTotalDuration } from "@/features/animation";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { debounce } from "@/lib/utils/debounce";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import {
  useUserUsage,
  USAGE_QUERY_KEY,
  fetchUserUsage,
} from "@/features/user/queries";

import { ShareMetadataForm } from "./share-dialog/share-metadata-form";
import { ShareTabPublic } from "./share-dialog/tabs/share-tab-public";
import { ShareTabEmbed } from "./share-dialog/tabs/share-tab-embed";
import { ShareTabPlatforms } from "./share-dialog/tabs/share-tab-platforms";
import { ShareTabSocial } from "./share-dialog/tabs/share-tab-social";
import { ShareTabPreview } from "./share-dialog/tabs/share-tab-preview";
import { ExportOverlay } from "./share-dialog/export-overlay";
import { LoginDialog } from "@/features/login";

const shareFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(200, "Max 200 characters").optional(),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

interface ShareError extends Error {
  code?: "AUTH_REQUIRED" | "PUBLIC_SHARE_LIMIT";
  current?: number;
  max?: number;
}

const TAB_KEYS = ["public", "embed", "platforms", "social", "preview"] as const;

const defaultEmbedSizes = {
  width: "100%",
  height: "420",
};

export const EnhancedAnimationShareDialog = () => {
  const user = useUserStore((state) => state.user);
  const slides = useAnimationStore((state) => state.slides);
  const animationSettings = useAnimationStore(
    (state) => state.animationSettings
  );
  const totalDuration = useMemo(() => calculateTotalDuration(slides), [slides]);

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const showBackground = useEditorStore((state) => state.showBackground);
  const editor = useEditorStore((state) => state.editor);
  const showLineNumbers = useEditorStore((state) => state.showLineNumbers);

  const [open, setOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.location.origin : null
  );
  const [shareUrl, setShareUrl] = useState("");
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [ogPreviewUrl, setOgPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<(typeof TAB_KEYS)[number]>("public");
  const [embedWidth, setEmbedWidth] = useState(defaultEmbedSizes.width);
  const [embedHeight, setEmbedHeight] = useState(defaultEmbedSizes.height);
  const previewTrackedRef = useRef(false);
  const loadTimestampRef = useRef<number | null>(null);
  const firstExportTrackedRef = useRef(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [cancelExport, setCancelExport] = useState(false);

  const queryClient = useQueryClient();
  const { data: usage } = useUserUsage(user?.id);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<{
    current?: number;
    max?: number | null;
  }>({
    current: 0,
    max: null,
  });

  const { copy: copyLink, isCopying: isCopyingLink } = useCopyToClipboard({
    successMessage: "Link copied to clipboard.",
  });
  const { copy: copyEmbed, isCopying: isCopyingEmbed } = useCopyToClipboard({
    successMessage: "Embed code copied.",
  });
  const { copy: copySnippet, isCopying: isCopyingSnippet } = useCopyToClipboard(
    {
      successMessage: "Copied to clipboard.",
    }
  );

  const serializedSlides = useMemo(
    () =>
      slides.map((slide) => ({
        id: slide.id,
        code: slide.code,
        title: slide.title,
        language: slide.language,
        autoDetectLanguage: slide.autoDetectLanguage,
        duration: slide.duration,
      })),
    [slides]
  );

  const payload = useMemo<AnimationSharePayload>(
    () => ({
      slides: serializedSlides,
      settings: animationSettings,
      editor: {
        backgroundTheme,
        fontFamily,
        fontSize,
        showBackground,
        editor,
        showLineNumbers,
      },
    }),
    [
      animationSettings,
      backgroundTheme,
      editor,
      fontFamily,
      fontSize,
      serializedSlides,
      showBackground,
      showLineNumbers,
    ]
  );

  const firstSlide = serializedSlides[0];

  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      title: firstSlide?.title || "My animation",
      description: "",
    },
  });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset({
        title: firstSlide?.title || "My animation",
        description: "",
      });
    }
  }, [firstSlide?.title, form]);

  const titleValue = useWatch({ control: form.control, name: "title" });
  const descriptionValue = useWatch({
    control: form.control,
    name: "description",
  });

  useEffect(() => {
    if (!loadTimestampRef.current) {
      loadTimestampRef.current = Date.now();
    }
  }, []);
  const trackMetadataUpdated = useMemo(
    () =>
      debounce((field: "title" | "description", hasValue: boolean) => {
        trackAnimationEvent("share_metadata_updated", user, {
          field,
          has_value: hasValue,
        });
      }, 600),
    [user]
  );

  const buildOgPreviewUrl = useCallback(() => {
    // Use the slug if available, otherwise return null
    // This avoids URL length issues by fetching data from the database
    if (!shareSlug) {
      return null;
    }

    const params = new URLSearchParams();
    params.set("slug", shareSlug);
    params.set("mode", "embed");
    const currentTitle = form.getValues("title");
    const currentDescription = form.getValues("description");

    // Override title/description if they differ from what's in the database
    if (currentTitle) params.set("title", currentTitle);
    if (currentDescription) params.set("description", currentDescription);
    params.set("ts", Date.now().toString());

    return `/api/og-image?${params.toString()}`;
  }, [form, shareSlug]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    trackMetadataUpdated("title", Boolean(titleValue?.trim()));
  }, [form.formState.isDirty, titleValue, trackMetadataUpdated]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    trackMetadataUpdated("description", Boolean(descriptionValue?.trim()));
  }, [descriptionValue, form.formState.isDirty, trackMetadataUpdated]);

  const openUpgradeForShares = (current?: number, max?: number | null) => {
    setUpgradeContext({
      current,
      max: typeof max === "number" ? max : null,
    });
    setIsUpgradeOpen(true);
  };

  const shortenUrlMutation = useMutation({
    mutationFn: async (params: {
      url: string;
      title?: string;
      description?: string;
    }) => {
      const response = await fetch("/api/shorten-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          snippet_id: "",
          url: params.url,
          title: params.title,
          description: params.description,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        if (response.status === 401) {
          const authError = new Error("AUTH_REQUIRED");
          (authError as any).code = "AUTH_REQUIRED";
          throw authError;
        }

        if (response.status === 429) {
          const limitError = new Error(
            data?.error || "Public share limit reached"
          );
          (limitError as any).code = "PUBLIC_SHARE_LIMIT";
          (limitError as any).current = data?.current;
          (limitError as any).max = data?.max;
          (limitError as any).plan = data?.plan;
          throw limitError;
        }

        throw new Error(data?.error || "Failed to shorten URL");
      }

      const data = await response.json();
      return data.short_url as string;
    },
  });

  const generateShareUrl = useCallback(
    async (values?: ShareFormValues) => {
      if (!currentUrl) {
        return undefined;
      }

      if (!user) {
        setIsLoginDialogOpen(true);
        return undefined;
      }

      // Refresh usage data immediately before checking limits to minimize race conditions
      // with server-side state. The server-side validation in the API endpoint is the
      // source of truth and will return 429 if limits are exceeded.
      const freshUsage = await queryClient.fetchQuery({
        queryKey: [USAGE_QUERY_KEY, user.id],
        queryFn: () => fetchUserUsage(user.id),
      });

      const publicShares = freshUsage?.publicShares;
      if (
        publicShares &&
        publicShares.max !== null &&
        publicShares.current >= publicShares.max
      ) {
        openUpgradeForShares(publicShares.current, publicShares.max);
        toast.error(
          "You've reached your public view limit. Upgrade for more views."
        );
        return undefined;
      }

      const parsed = shareFormSchema.safeParse(values ?? form.getValues());
      if (!parsed.success) {
        void form.trigger();
        return undefined;
      }

      if (serializedSlides.length < 2) {
        toast.error("Add at least two slides to share an animation.");
        return undefined;
      }

      try {
        const encodedPayload = encodeAnimationSharePayload(payload);
        const storedValue = `animation:${encodedPayload}`;

        const shortUrl = await shortenUrlMutation.mutateAsync({
          url: storedValue,
          title: parsed.data.title,
          description: parsed.data.description,
        });

        const fullUrl = `${currentUrl}/animate/shared/${shortUrl}`;

        setShareUrl(fullUrl);
        setShareSlug(shortUrl);

        // Build OG preview URL with the new slug
        const ogParams = new URLSearchParams();
        ogParams.set("slug", shortUrl);
        ogParams.set("mode", "embed");
        if (parsed.data.title) ogParams.set("title", parsed.data.title);
        if (parsed.data.description)
          ogParams.set("description", parsed.data.description);
        ogParams.set("ts", Date.now().toString());
        setOgPreviewUrl(`/api/og-image?${ogParams.toString()}`);

        form.reset(parsed.data);
        previewTrackedRef.current = false;

        trackAnimationEvent("share_animation_link", user, {
          slide_count: serializedSlides.length,
          has_title: Boolean(parsed.data.title?.trim()),
          has_description: Boolean(parsed.data.description?.trim()),
          url_generated: Boolean(fullUrl),
        });

        await queryClient.invalidateQueries({
          queryKey: [USAGE_QUERY_KEY, user?.id],
        });

        return fullUrl;
      } catch (error) {
        console.error("Failed to generate share URL", error);
        const err = error as ShareError;

        if (err?.code === "AUTH_REQUIRED") {
          setIsLoginDialogOpen(true);
          return undefined;
        }

        if (err?.code === "PUBLIC_SHARE_LIMIT") {
          openUpgradeForShares(err?.current, err?.max);
          toast.error(
            "Public share limit reached. Upgrade to continue sharing."
          );
          return undefined;
        }

        toast.error("Oh no, something went wrong. Please try again.");
        return undefined;
      }
    },
    [
      currentUrl,
      form,
      payload,
      queryClient,
      serializedSlides.length,
      shortenUrlMutation,
      user,
    ]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !user) {
      setIsLoginDialogOpen(true);
      return;
    }

    setOpen(nextOpen);

    if (nextOpen) {
      trackAnimationEvent("share_modal_opened", user);
      void generateShareUrl();
    } else {
      setActiveTab("public");
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handlePlatformCopy = (
    platform: "hashnode" | "medium" | "devto" | "notion"
  ) => {
    if (!shareUrl) return;

    const title = form.getValues("title") || "Shared animation";
    const platformSnippet = generatePlatformUrl(platform, shareUrl, title);

    // If platform returns "iframe", use the actual iframe embed code
    const contentToCopy =
      platformSnippet === "iframe" ? embedCode : platformSnippet;

    void copySnippet(contentToCopy);

    trackAnimationEvent("share_platform_copy", user, {
      platform,
      has_title: Boolean(title?.trim()),
      url_generated: Boolean(shareUrl),
    });
  };

  const socialLinks = useMemo(
    () => ({
      twitter: generateSocialShareUrl(
        "twitter",
        shareUrl,
        titleValue || "My animation",
        descriptionValue
      ),
      linkedin: generateSocialShareUrl(
        "linkedin",
        shareUrl,
        titleValue || "My animation",
        descriptionValue
      ),
    }),
    [descriptionValue, shareUrl, titleValue]
  );

  const handleSocialShare = (platform: "twitter" | "linkedin") => {
    const target = socialLinks[platform];
    if (!target) return;
    trackAnimationEvent("social_share_clicked", user, { platform });
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const handleTabChange = (value: (typeof TAB_KEYS)[number]) => {
    setActiveTab(value);
    trackAnimationEvent("share_tab_changed", user, { tab: value });

    if (value === "preview" && shareSlug && !previewTrackedRef.current) {
      trackAnimationEvent("og_image_viewed", user, { slug: shareSlug });
      previewTrackedRef.current = true;
    }
  };

  const handleRefreshPreview = () => {
    void generateShareUrl();
    setOgPreviewUrl(buildOgPreviewUrl());
    previewTrackedRef.current = false;
    trackAnimationEvent("share_preview_refreshed", user, {
      slug: shareSlug,
    });
  };

  const embedCode = useMemo(
    () =>
      generateEmbedCode(shareUrl, {
        width: embedWidth || defaultEmbedSizes.width,
        height: embedHeight || defaultEmbedSizes.height,
      }),
    [shareUrl, embedWidth, embedHeight]
  );

  const isGenerating = shortenUrlMutation.isPending;

  const handleCopyUrl = useCallback(async () => {
    try {
      if (!user) {
        setIsLoginDialogOpen(true);
        return;
      }

      const latestUrl =
        shareUrl && !form.formState.isDirty
          ? shareUrl
          : await generateShareUrl();
      if (!latestUrl) {
        return;
      }
      trackAnimationEvent("copy_link", user, {
        from: "share_dialog",
        link_type: "animation",
      });
      await copyLink(latestUrl);
    } catch (error) {
      console.error("Failed to copy link", error);
      toast.error("Could not generate and copy the link. Please try again.");
    }
  }, [copyLink, form.formState.isDirty, generateShareUrl, shareUrl, user]);

  const handleEmbedCopy = useCallback(async () => {
    try {
      const latestUrl =
        shareUrl && !form.formState.isDirty
          ? shareUrl
          : await generateShareUrl();
      if (!latestUrl) {
        return;
      }

      const code = generateEmbedCode(latestUrl, {
        width: embedWidth || defaultEmbedSizes.width,
        height: embedHeight || defaultEmbedSizes.height,
      });

      trackAnimationEvent("embed_code_copied", user, {
        embed_width: embedWidth || defaultEmbedSizes.width,
        embed_height: embedHeight || defaultEmbedSizes.height,
      });
      await copyEmbed(code);
    } catch (error) {
      console.error("Failed to copy embed code", error);
      toast.error(
        "Could not generate and copy the embed code. Please try again."
      );
    }
  }, [
    copyEmbed,
    embedHeight,
    embedWidth,
    form.formState.isDirty,
    generateShareUrl,
    shareUrl,
    user,
  ]);

  const handleExport = () => {
    if (!user) {
      setIsLoginDialogOpen(true);
      trackAnimationEvent("guest_upgrade_prompted", user, {
        trigger: "download_animation_share_modal",
      });
      return;
    }

    if (serializedSlides.length < 2) {
      toast.error("Add at least two slides to export.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setCancelExport(false);
    const isFirstExport = !firstExportTrackedRef.current;
    if (isFirstExport) {
      firstExportTrackedRef.current = true;
    }
    trackAnimationEvent("export_started", user, {
      format: animationSettings.exportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      total_duration: totalDuration,
      transition_type: animationSettings.transitionType,
      export_format_experiment:
        process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment:
        process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
      time_to_first_export_ms:
        isFirstExport && loadTimestampRef.current !== null
          ? Date.now() - loadTimestampRef.current
          : undefined,
    });
  };

  const handleCancelExport = () => {
    setCancelExport(true);
    trackAnimationEvent("export_cancelled", user, {
      progress_percent: Math.round(exportProgress * 100),
      format: animationSettings.exportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      export_format_experiment:
        process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment:
        process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
    });
  };

  const onExportComplete = (blob: Blob) => {
    setIsExporting(false);
    setExportProgress(0);
    setCancelExport(false);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animation-${Date.now()}.${animationSettings.exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    trackAnimationEvent("export_completed", user, {
      format: animationSettings.exportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      file_size_mb: Number((blob.size / (1024 * 1024)).toFixed(2)),
      duration_seconds: totalDuration,
      transition_type: animationSettings.transitionType,
      export_format_experiment:
        process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment:
        process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
    });

    toast.success("Video downloaded successfully.");
  };

  return (
    <>
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        limitType="publicShares"
        currentCount={upgradeContext.current ?? 0}
        maxCount={upgradeContext.max ?? null}
        currentPlan={usage?.plan}
      />
      <LoginDialog
        open={isLoginDialogOpen && !user}
        onOpenChange={setIsLoginDialogOpen}
        hideTrigger
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Tooltip content="Share animation link">
          <DialogTrigger asChild>
            <Button size="sm" className="whitespace-nowrap">
              <i className="ri-share-forward-line text-lg mr-2"></i>
              Share
            </Button>
          </DialogTrigger>
        </Tooltip>

        <DialogContent className="max-w-2xl gap-0">
          <DialogHeader>
            <DialogTitle>Share animation</DialogTitle>
            <DialogDescription>
              Generate links, embeds, and videos to share your code animation
              anywhere.
            </DialogDescription>
          </DialogHeader>

          {isExporting && (
            <ExportOverlay
              progress={exportProgress}
              cancelExport={cancelExport}
              onCancel={handleCancelExport}
              slides={slides}
              settings={animationSettings}
              editorSettings={{
                backgroundTheme,
                fontFamily,
                fontSize,
                showBackground,
              }}
              onProgress={setExportProgress}
              onComplete={onExportComplete}
              onError={(err: Error) => {
                console.error(err);
                setIsExporting(false);
                setCancelExport(false);
                trackAnimationEvent("export_failed", user, {
                  error_type: err?.message || "unknown",
                  format: animationSettings.exportFormat,
                  resolution: animationSettings.resolution,
                  slide_count: serializedSlides.length,
                  transition_type: animationSettings.transitionType,
                  progress_percent: Math.round(exportProgress * 100),
                  export_format_experiment:
                    process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
                  transition_experiment:
                    process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
                });
                toast.error("Export failed. Please try again.");
              }}
              onCancelled={() => {
                setIsExporting(false);
                setExportProgress(0);
                setCancelExport(false);
                toast("Export canceled.");
              }}
            />
          )}

          <div className="">
            <ShareMetadataForm control={form.control} />

            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                handleTabChange(value as (typeof TAB_KEYS)[number])
              }
            >
              <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1 px-4 border-b border-t rounded-none py-4">
                <TabsTrigger value="public">Public link</TabsTrigger>
                <TabsTrigger value="platforms">Platforms</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="embed">Embed code</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="public">
                <ShareTabPublic
                  shareUrl={shareUrl}
                  isGenerating={isGenerating}
                  onCopy={() => void handleCopyUrl()}
                  isCopying={isCopyingLink}
                />
              </TabsContent>

              <TabsContent value="embed">
                <ShareTabEmbed
                  width={embedWidth}
                  height={embedHeight}
                  onWidthChange={setEmbedWidth}
                  onHeightChange={setEmbedHeight}
                  embedCode={embedCode}
                  isGenerating={shortenUrlMutation.isPending}
                  isCopying={isCopyingEmbed}
                  onCopy={() => void handleEmbedCopy()}
                  previewUrl={
                    shareUrl
                      ? shareUrl.replace("/animate/shared/", "/animate/embed/")
                      : ""
                  }
                  ogPreviewUrl={ogPreviewUrl}
                />
              </TabsContent>

              <TabsContent value="platforms">
                <ShareTabPlatforms
                  shareUrl={shareUrl}
                  isExporting={isExporting}
                  isCopyingSnippet={isCopyingSnippet}
                  onExport={handleExport}
                  onPlatformCopy={handlePlatformCopy}
                />
              </TabsContent>

              <TabsContent value="social">
                <ShareTabSocial
                  shareUrl={shareUrl}
                  isExporting={isExporting}
                  onExport={handleExport}
                  onSocialShare={handleSocialShare}
                />
              </TabsContent>

              <TabsContent value="preview">
                <ShareTabPreview
                  ogPreviewUrl={ogPreviewUrl}
                  isGenerating={isGenerating}
                  onRefresh={handleRefreshPreview}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
