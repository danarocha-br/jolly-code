import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ResetAnimationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function ResetAnimationDialog({
	open,
	onOpenChange,
	onConfirm,
}: ResetAnimationDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Are you sure you want to reset the animation?</DialogTitle>

				</DialogHeader>
				<p className="text-sm font-light px-4">This will reset your current animation to its default state. This action cannot be undone.</p>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							onConfirm();
							onOpenChange(false);
						}}
					>
						Reset animation
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
