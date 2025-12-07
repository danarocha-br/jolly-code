"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import { calculateTotalDuration } from "@/features/animation";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { ExportOverlay } from "./share-dialog/export-overlay";
import { GifExporter } from "./gif-exporter";

export const AnimationDownloadMenu = () => {
	const user = useUserStore((state) => state.user);
	const slides = useAnimationStore((state) => state.slides);
	const animationSettings = useAnimationStore((state) => state.animationSettings);
	const totalDuration = useMemo(() => calculateTotalDuration(slides), [slides]);

	const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
	const fontFamily = useEditorStore((state) => state.fontFamily);
	const fontSize = useEditorStore((state) => state.fontSize);
	const showBackground = useEditorStore((state) => state.showBackground);

	const loadTimestampRef = useRef<number | null>(null);
	const firstExportTrackedRef = useRef(false);

	// Export state
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState(0);
	const [cancelExport, setCancelExport] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [currentExportFormat, setCurrentExportFormat] = useState<"mp4" | "webm" | "gif">("mp4");

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

	// Track load timestamp
	if (!loadTimestampRef.current) {
		loadTimestampRef.current = Date.now();
	}

	const handleExport = (format: "mp4" | "webm" | "gif" = "mp4") => {
		if (serializedSlides.length < 2) {
			toast.error("Add at least two slides to export.");
			return;
		}

		setCurrentExportFormat(format);
		setDropdownOpen(false);
		setIsExporting(true);
		setExportProgress(0);
		setCancelExport(false);
		const isFirstExport = !firstExportTrackedRef.current;
		if (isFirstExport) {
			firstExportTrackedRef.current = true;
		}
		trackAnimationEvent("export_started", user, {
			format: format,
			resolution: animationSettings.resolution,
			slide_count: serializedSlides.length,
			total_duration: totalDuration,
			transition_type: animationSettings.transitionType,
			export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
			transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
			time_to_first_export_ms:
				isFirstExport && loadTimestampRef.current !== null
					? Date.now() - loadTimestampRef.current
					: undefined,
			source: "download_menu",
		});
	};

	const handleCancelExport = () => {
		setCancelExport(true);
		trackAnimationEvent("export_cancelled", user, {
			progress_percent: Math.round(exportProgress * 100),
			format: currentExportFormat,
			resolution: animationSettings.resolution,
			slide_count: serializedSlides.length,
			export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
			transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
			source: "download_menu",
		});
	};

	const onExportComplete = (blob: Blob) => {
		setIsExporting(false);
		setExportProgress(0);
		setCancelExport(false);

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `animation-${Date.now()}.${currentExportFormat}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		trackAnimationEvent("export_completed", user, {
			format: currentExportFormat,
			resolution: animationSettings.resolution,
			slide_count: serializedSlides.length,
			file_size_mb: Number((blob.size / (1024 * 1024)).toFixed(2)),
			duration_seconds: totalDuration,
			transition_type: animationSettings.transitionType,
			export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
			transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
			source: "download_menu",
		});

		toast.success(`${currentExportFormat.toUpperCase()} downloaded successfully.`);
	};

	return (
		<>
			<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
				<Tooltip content="Download animation">
					<DropdownMenuTrigger asChild>
						<Button size="sm" variant="secondary" className="whitespace-nowrap">
							<i className="ri-download-line text-lg mr-2"></i>
							Download
						</Button>
					</DropdownMenuTrigger>
				</Tooltip>

				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => handleExport("mp4")}>
						<i className="ri-video-line text-lg mr-2"></i>
						Download Video (MP4)
					</DropdownMenuItem>
					<DropdownMenuItem className="justify-start" onClick={() => handleExport("gif")}>
						<i className="ri-image-line text-lg mr-2"></i>
						Download as GIF
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{isExporting && (
				<div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center">
					{currentExportFormat === "gif" ? (
						<div className="relative">
							<div className="w-full max-w-md space-y-4 py-4 bg-card border rounded-xl shadow-lg">
								<div className="px-4 space-y-3">
									<div className="flex items-center justify-between">
										<h3 className="font-semibold">Generating GIF...</h3>
										<span className="text-sm text-muted-foreground">{Math.round(exportProgress * 100)}%</span>
									</div>
									<div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
										<div
											className="h-full bg-success transition-all duration-300 ease-out"
											style={{ width: `${exportProgress * 100}%` }}
										/>
									</div>
									<p className="text-xs text-muted-foreground">
										Please wait while we render your animation frame by frame.
									</p>
								</div>
								<div className="flex justify-center border-t pt-2 -mb-2 px-2">
									<Button
										type="button"
										variant="secondary"
										size="sm"
										className="w-full"
										onClick={handleCancelExport}
										disabled={cancelExport}
									>
										{cancelExport ? "Cancelling..." : "Cancel export"}
									</Button>
								</div>
							</div>
							<GifExporter
								slides={slides}
								settings={{ ...animationSettings, exportFormat: currentExportFormat }}
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
										format: currentExportFormat,
										resolution: animationSettings.resolution,
										slide_count: serializedSlides.length,
										transition_type: animationSettings.transitionType,
										progress_percent: Math.round(exportProgress * 100),
										export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
										transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
										source: "download_menu",
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
					) : (
						<ExportOverlay
							progress={exportProgress}
							cancelExport={cancelExport}
							onCancel={handleCancelExport}
							slides={slides}
							settings={{ ...animationSettings, exportFormat: currentExportFormat }}
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
									format: currentExportFormat,
									resolution: animationSettings.resolution,
									slide_count: serializedSlides.length,
									transition_type: animationSettings.transitionType,
									progress_percent: Math.round(exportProgress * 100),
									export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
									transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
									source: "download_menu",
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
				</div>
			)}
		</>
	);
};
