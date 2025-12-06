"use client";

import { Button } from "@/components/ui/button";

interface ShareTabSocialProps {
	shareUrl: string;
	isExporting: boolean;
	onExport: () => void;
	onSocialShare: (platform: "twitter" | "linkedin") => void;
}

export const ShareTabSocial = ({
	shareUrl,
	isExporting,
	onExport,
	onSocialShare,
}: ShareTabSocialProps) => {
	return (
		<div className="space-y-4">
			<div className="space-y-1 px-4 pt-2">
				<h4 className="text-sm font-medium">Download Video</h4>

				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
					<p className="text-sm text-muted-foreground">
						Download a high-quality video of your animation to share on any platform.
					</p>
					<Button
						type="button"
						variant="default"
						size="lg"
						onClick={onExport}
						disabled={isExporting}
						className="whitespace-nowrap"
					>
						<i className="ri-download-line mr-2"></i>
						Download Video
					</Button>
				</div>
			</div>

			<div className="space-y-3 pt-4 border-t px-4">
				<h4 className="text-sm font-medium">Share Link</h4>
				<p className="text-sm text-muted-foreground">Share the public link directly.</p>
				<div className="flex flex-col md:flex-row gap-3">
					<Button
						type="button"
						className="flex-1 bg-[#1d9bf0] hover:bg-[#1a8cd8]"
						onClick={() => onSocialShare("twitter")}
						disabled={!shareUrl}
					>
						<i className="ri-twitter-x-line mr-2"></i>
						Share on X
					</Button>
					<Button
						type="button"
						className="flex-1 bg-[#0a66c2] hover:bg-[#0a66c2]/90"
						onClick={() => onSocialShare("linkedin")}
						disabled={!shareUrl}
					>
						<i className="ri-linkedin-fill mr-2"></i>
						Share on LinkedIn
					</Button>
				</div>
			</div>
		</div>
	);
};
