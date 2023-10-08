import { useCallback } from "react";
import React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CtaButton } from "@/components/ui/cta-button";
import { Logo } from "@/components/ui/logo";
import { useMutation } from "react-query";
import { toast } from "sonner";

type LoginProps = {
  children: React.ReactNode;
};

export const LoginDialog = ({ children }: LoginProps) => {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const signInWithGithub = useMutation(
    async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
      });

      if (error) {
        console.log(error);
        toast.error("Sorry, something went wrong. Please try again.");
      }
    },
    {
      onSuccess: () => {
        router.refresh();
      },
    }
  );

  const handleSignInWithGithub = useCallback(() => {
    signInWithGithub.mutate();
  }, [signInWithGithub]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogDescription className="text-center flex flex-col justify-center items-center">
            <div>
              <Logo variant="short" />
            </div>
            <p className="mt-8 font-semibold text-3xl">Create an account</p>
            <p className="mt-4 text-base font-normal">
              Create, manage and share code snippets with Jolly Code.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <CtaButton
            label="Sign in with Github"
            onClick={handleSignInWithGithub}
          >
            <GitHubLogoIcon className="mr-4 scale-125" />
            Sign in with Github
          </CtaButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
