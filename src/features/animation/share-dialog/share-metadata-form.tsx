"use client";

import { Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Controller } from "react-hook-form";

// Define the form schema type locally or import it if shared. 
// For now, I'll use 'any' or better, a generic or specific type if I export it.
// The parent file had:
// const shareFormSchema = z.object({
//   title: z.string().min(1, "Title is required").max(100),
//   description: z.string().max(200, "Max 200 characters").optional(),
// });
// type ShareFormValues = z.infer<typeof shareFormSchema>;

interface ShareMetadataFormProps {
	control: Control<any>; // using any to avoid circular dependency mess for now, or I can define the interface
}

export const ShareMetadataForm = ({ control }: ShareMetadataFormProps) => {
	return (
		<FieldGroup className="bg-accent dark:bg-muted/30 px-4 py-2 grid grid-cols-1 gap-2 space-y-0">
			<Controller
				control={control}
				name="title"
				render={({ field, fieldState }) => (
					<Field orientation="horizontal" data-invalid={fieldState.invalid}>
						<FieldLabel className="w-30">Title</FieldLabel>
						<Input placeholder="Animation title" {...field} />
						{fieldState.invalid && (
							<FieldError errors={[fieldState.error]} />
						)}
					</Field>
				)}
			/>
			<Controller
				control={control}
				name="description"
				render={({ field, fieldState }) => (
					<Field orientation="horizontal" data-invalid={fieldState.invalid}>
						<FieldLabel className="w-30">Description</FieldLabel>
						<Input placeholder="Add a short description (optional)" {...field} />

						{fieldState.invalid && (
							<FieldError errors={[fieldState.error]} />
						)}
					</Field>
				)}
			/>
		</FieldGroup>
	);
};
