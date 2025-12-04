"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import {
  AnimationSharePayload,
  encodeAnimationSharePayload,
  generateEmbedCode,
  generatePlatformUrl,
  generateSocialShareUrl,
} from "@/features/animation/share-utils";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { VideoExporter } from "./video-exporter";
import { calculateTotalDuration } from "@/features/animation";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { debounce } from "@/lib/utils/debounce";

const shareFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(200, "Max 200 characters").optional(),
});

type ShareFormValues = z.infer<typeof shareFormSchema>;

const TAB_KEYS = ["public", "embed", "platforms", "social", "preview"] as const;

const defaultEmbedSizes = {
  width: "100%",
  height: "420",
};

export const EnhancedAnimationShareDialog = () => {
  const user = useUserStore((state) => state.user);
  const slides = useAnimationStore((state) => state.slides);
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const totalDuration = useMemo(() => calculateTotalDuration(slides), [slides]);

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const showBackground = useEditorStore((state) => state.showBackground);
  const editor = useEditorStore((state) => state.editor);
  const showLineNumbers = useEditorStore((state) => state.showLineNumbers);

  const [open, setOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [ogPreviewUrl, setOgPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("public");
  const [embedWidth, setEmbedWidth] = useState(defaultEmbedSizes.width);
  const [embedHeight, setEmbedHeight] = useState(defaultEmbedSizes.height);
  const previewTrackedRef = useRef(false);
  const loadTimestampRef = useRef<number>(Date.now());
  const firstExportTrackedRef = useRef(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [cancelExport, setCancelExport] = useState(false);

  const { copy: copyLink, isCopying: isCopyingLink } = useCopyToClipboard({
    successMessage: "Link copied to clipboard.",
  });
  const { copy: copyEmbed, isCopying: isCopyingEmbed } = useCopyToClipboard({
    successMessage: "Embed code copied.",
  });
  const { copy: copySnippet, isCopying: isCopyingSnippet } = useCopyToClipboard({
    successMessage: "Copied to clipboard.",
  });

  useEffect(() => {
    setCurrentUrl(window.location.origin);
  }, []);

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

  const titleValue = form.watch("title");
  const descriptionValue = form.watch("description");
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

  const buildOgPreviewUrl = useCallback(
    () => {
      // Use the slug if available, otherwise return null
      // This avoids URL length issues by fetching data from the database
      if (!shareSlug) {
        return null;
      }

      const params = new URLSearchParams();
      params.set("slug", shareSlug);
      const currentTitle = form.getValues("title");
      const currentDescription = form.getValues("description");

      // Override title/description if they differ from what's in the database
      if (currentTitle) params.set("title", currentTitle);
      if (currentDescription) params.set("description", currentDescription);
      params.set("ts", Date.now().toString());

      return `/api/og-image?${params.toString()}`;
    },
    [form, shareSlug]
  );

  useEffect(() => {
    if (!form.formState.isDirty) return;
    trackMetadataUpdated("title", Boolean(titleValue?.trim()));
  }, [form.formState.isDirty, titleValue, trackMetadataUpdated]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    trackMetadataUpdated("description", Boolean(descriptionValue?.trim()));
  }, [descriptionValue, form.formState.isDirty, trackMetadataUpdated]);

  const shortenUrlMutation = useMutation({
    mutationFn: async (params: { url: string; title?: string; description?: string }) => {
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
        throw new Error("Failed to shorten URL");
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
        if (parsed.data.title) ogParams.set("title", parsed.data.title);
        if (parsed.data.description) ogParams.set("description", parsed.data.description);
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

        return fullUrl;
      } catch (error) {
        console.error("Failed to generate share URL", error);
        toast.error("Oh no, something went wrong. Please try again.");
        return undefined;
      }
    },
    [currentUrl, form, payload, serializedSlides.length, shortenUrlMutation, user]
  );

  const handleOpenChange = (nextOpen: boolean) => {
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

  const handlePlatformCopy = (platform: "hashnode" | "medium" | "devto" | "notion") => {
    trackAnimationEvent("platform_share_clicked", user, { platform });
    void copySnippet(generatePlatformUrl(platform, shareUrl, titleValue || "My animation"));
  };

  const socialLinks = useMemo(
    () => ({
      twitter: generateSocialShareUrl("twitter", shareUrl, titleValue || "My animation", descriptionValue),
      linkedin: generateSocialShareUrl("linkedin", shareUrl, titleValue || "My animation", descriptionValue),
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
    [embedHeight, embedWidth, shareUrl]
  );

  const platformButtons = useMemo(
    () => [
      { key: "hashnode", label: "Hashnode" },
      { key: "medium", label: "Medium" },
      { key: "devto", label: "Dev.to" },
      { key: "notion", label: "Notion" },
    ],
    []
  );

  const isGenerating = shortenUrlMutation.isPending;

  const handleCopyUrl = useCallback(async () => {
    try {
      const latestUrl = shareUrl && !form.formState.isDirty ? shareUrl : await generateShareUrl();
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
      const latestUrl = shareUrl && !form.formState.isDirty ? shareUrl : await generateShareUrl();
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
      toast.error("Could not generate and copy the embed code. Please try again.");
    }
  }, [copyEmbed, embedHeight, embedWidth, form.formState.isDirty, generateShareUrl, shareUrl, user]);

  const handleExport = () => {
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
      export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
      time_to_first_export_ms: isFirstExport
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
      export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
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
      export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
    });

    toast.success("Video downloaded successfully.");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip content="Share animation link">
        <DialogTrigger asChild>
          <Button size="sm" className="whitespace-nowrap">
            <i className="ri-share-forward-line text-lg mr-2"></i>
            Share
          </Button>
        </DialogTrigger>
      </Tooltip>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Share animation</DialogTitle>
          <DialogDescription>
            Generate links, embeds, and videos to share your code animation anywhere.
          </DialogDescription>
        </DialogHeader>

        {isExporting && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
            <div className="w-full max-w-md space-y-4 p-6 bg-card border rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Generating video...</h3>
                <span className="text-sm text-muted-foreground">{Math.round(exportProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Please wait while we render your animation frame by frame.
              </p>
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelExport}
                  disabled={cancelExport}
                >
                  {cancelExport ? "Cancelling..." : "Cancel export"}
                </Button>
              </div>
            </div>

            <VideoExporter
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
                  export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
                  transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
                });
                toast.error("Export failed. Please try again.");
              }}
              cancelled={cancelExport}
              onCancelled={() => {
                setIsExporting(false);
                setExportProgress(0);
                setCancelExport(false);
                toast("Export canceled.");
              }}
            />
          </div>
        )}

        <Form {...form}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Animation title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Add a short description" {...field} />
                    </FormControl>
                    <FormDescription className="text-muted-foreground">
                      Optional – shown on previews.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as (typeof TAB_KEYS)[number])}>
              <TabsList className="grid grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="public">Public link</TabsTrigger>
                <TabsTrigger value="embed">Embed code</TabsTrigger>
                <TabsTrigger value="platforms">Platforms</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="public" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="animation-share-url">Public URL</Label>
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <Input
                      id="animation-share-url"
                      value={shareUrl}
                      readOnly
                      placeholder={isGenerating ? "Generating link..." : "Generate a link to share"}
                    />
                    <div className="flex gap-2">
                      <Button variant="secondary" type="button" onClick={() => void handleCopyUrl()} disabled={isGenerating || isCopyingLink}>
                        {isGenerating ? "Generating..." : isCopyingLink ? "Copying..." : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="embed" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="embed-width">Width</Label>
                    <Input
                      id="embed-width"
                      value={embedWidth}
                      onChange={(event) => setEmbedWidth(event.target.value)}
                      placeholder="100%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="embed-height">Height</Label>
                    <Input
                      id="embed-height"
                      value={embedHeight}
                      onChange={(event) => setEmbedHeight(event.target.value)}
                      placeholder="420"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Embed code</Label>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <pre className="text-sm whitespace-pre-wrap break-all font-mono text-muted-foreground">
                      {embedCode || "Generate a link to preview the embed snippet."}
                    </pre>
                  </div>
                </div>

                <DialogFooter className="flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Customize the iframe size before copying the embed code.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void handleEmbedCopy()} disabled={isGenerating || isCopyingEmbed}>
                      {isGenerating ? "Generating..." : isCopyingEmbed ? "Copying..." : "Copy embed"}
                    </Button>
                  </div>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="platforms" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Download Video</h4>
                  <p className="text-sm text-muted-foreground">
                    Download a high-quality video of your animation to share on any platform.
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className="w-full"
                    onClick={() => handleExport()}
                    disabled={isExporting}
                  >
                    <i className="ri-download-line mr-2"></i>
                    Download Video
                  </Button>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-medium">Embed Links</h4>
                  <p className="text-sm text-muted-foreground">
                    Or copy platform-specific embed snippets.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {platformButtons.map((platform) => (
                      <Button
                        key={`embed-${platform.key}`}
                        type="button"
                        variant="secondary"
                        className="justify-start"
                        onClick={() => handlePlatformCopy(platform.key as "hashnode" | "medium" | "devto" | "notion")}
                        disabled={!shareUrl || isCopyingSnippet}
                      >
                        <i className="ri-clipboard-line mr-2"></i>
                        {platform.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Download Video</h4>
                  <p className="text-sm text-muted-foreground">
                    Download a high-quality video to upload to any social media platform.
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className="w-full"
                    onClick={() => handleExport()}
                    disabled={isExporting}
                  >
                    <i className="ri-download-line mr-2"></i>
                    Download Video
                  </Button>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-medium">Share Link</h4>
                  <p className="text-sm text-muted-foreground">Share the public link directly.</p>
                  <div className="flex flex-col md:flex-row gap-3">
                    <Button
                      type="button"
                      className="flex-1 bg-[#1d9bf0] hover:bg-[#1a8cd8]"
                      onClick={() => handleSocialShare("twitter")}
                      disabled={!shareUrl}
                    >
                      <i className="ri-twitter-x-line mr-2"></i>
                      Share on X
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 bg-[#0a66c2] hover:bg-[#0a66c2]/90"
                      onClick={() => handleSocialShare("linkedin")}
                      disabled={!shareUrl}
                    >
                      <i className="ri-linkedin-fill mr-2"></i>
                      Share on LinkedIn
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Open Graph preview generated from your first slide.</p>
                    <p className="text-xs text-muted-foreground">
                      Cached for an hour. Refresh if you just updated the animation.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={handleRefreshPreview} disabled={isGenerating}>
                    Refresh preview
                  </Button>
                </div>

                <div className="rounded-xl border bg-muted/30 overflow-hidden">
                  {ogPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ogPreviewUrl}
                      alt="OG preview"
                      className="w-full h-[280px] object-cover bg-muted"
                    />
                  ) : (
                    <div className="w-full h-[280px] flex items-center justify-center text-muted-foreground">
                      Generate a link to see the OG image.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { EnhancedAnimationShareDialog as AnimationShareDialog };
