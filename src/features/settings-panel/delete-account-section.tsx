"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useUserStore, useEditorStore } from "@/app/store";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { deleteAccount } from "@/actions/user/delete-account";
import { RiAlertLine } from "react-icons/ri";

export function DeleteAccountSection() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      const result = await deleteAccount();
      
      if (result.error) {
        toast.error(result.error);
        setIsDeleting(false);
        setIsDialogOpen(false);
        return;
      }

      // Success - sign out the user on client side to clear JWT tokens
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.warn("Failed to sign out after account deletion:", signOutError);
        }
        
        // Clear all user-related state
        useUserStore.setState({ user: null });
        useEditorStore.getState().resetIsSnippetSaved();
        useEditorStore.getState().resetEditors();
        
        // Invalidate all queries to clear cached data
        queryClient.invalidateQueries();
      } catch (signOutError) {
        console.warn("Error during sign out after account deletion:", signOutError);
        // Continue anyway - the user is deleted, so the session will be invalid
      }

      // Success - show success message
      toast.success("Your account has been deleted successfully");
      setIsDeleting(false);
      setIsDialogOpen(false);
      
      // Use React transition for better UX (Next.js best practice)
      startTransition(() => {
        // Redirect to home page and force a hard reload to clear any cached user data
        window.location.href = "/";
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please try again or contact support."
      );
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Separator className="my-4" />
      <div className="px-4 space-y-4">
        <Alert variant="destructive">
          <RiAlertLine className="h-5 w-5" />
          <AlertTitle>Danger Zone</AlertTitle>
          <AlertDescription>
            Once you delete your account, there is no going back. All your data,
            including snippets, animations, collections, and subscription information,
            will be permanently deleted.
          </AlertDescription>
        </Alert>

        <Button
          variant="destructive"
          onClick={() => setIsDialogOpen(true)}
          className="w-full"
          size="lg"
        >
          <i className="ri-delete-bin-line text-lg mr-2" />
          Delete Account
        </Button>
      </div>

      <ConfirmDeleteDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Delete Your Account"
        description="Are you absolutely sure? This action cannot be undone. This will permanently delete your account, all your snippets, animations, collections, and cancel your subscription if you have one."
        confirmLabel={isDeleting || isPending ? "Deleting..." : "Yes, delete my account"}
        cancelLabel="Cancel"
        isLoading={isDeleting || isPending}
        onConfirm={handleDeleteAccount}
      />
    </>
  );
}

