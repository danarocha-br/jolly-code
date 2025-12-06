"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface ShareTabPublicProps {
	shareUrl: string;
	isGenerating: boolean;
	isCopying: boolean;
	onCopy: () => void;
}

export const ShareTabPublic = ({
	shareUrl,
	isGenerating,
	isCopying,
	onCopy,
}: ShareTabPublicProps) => {
	return (
		<div className="space-y-4">
			<FieldGroup className="max-w-full overflow-hidden px-4 pt-2">
				<Field orientation="horizontal">
					<FieldLabel className="w-30 whitespace-nowrap">
						Public URL
					</FieldLabel>
					<Input
						id="animation-share-url"
						value={shareUrl}
						readOnly
						placeholder={
							isGenerating
								? "Generating link..."
								: "Generate a link to share"
						}
					/>
					<Button
						type="button"
						onClick={onCopy}
						disabled={isGenerating || isCopying}
						className="rounded-full"
					>
						{isGenerating
							? "Generating..."
							: isCopying
								? "Copying..."
								: "Copy"}
					</Button>
				</Field>
			</FieldGroup>
		</div>
	);
};
