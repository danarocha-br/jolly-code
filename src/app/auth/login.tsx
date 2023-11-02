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
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type LoginProps = {
  children: React.ReactNode;
};

export const useSignInWithGithub = () => {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const previousRoute = location.href;
  localStorage.setItem("previousRoute", previousRoute);

  const signInWithGithub = useMutation(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
    });

    const previousRoute = localStorage.getItem("previousRoute");
    router.push(previousRoute || "/");

    if (error) {
      toast.error("Sorry, something went wrong. Please try again.");
    }
  });

  return signInWithGithub;
};

export const LoginDialog = ({ children }: LoginProps) => {
  const signInWithGithub = useSignInWithGithub();
  const isLoading = signInWithGithub.isLoading;

  const handleSignInWithGithub = useCallback(() => {
    signInWithGithub.mutate();
  }, [signInWithGithub]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="text-center flex justify-center">
            <Logo variant="short" />
          </div>

          <DialogDescription className="text-center flex flex-col justify-center items-center">
            {/* <p className="mt-8 font-semibold text-3xl">Create an account</p> */}
            <span className="mt-8 text-lg font-normal">
              Create, manage and share code snippets with Jolly Code.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 pt-8 pb-2">
          <CtaButton
            label="Sign in with Github"
            onClick={handleSignInWithGithub}
            isLoading={isLoading}
          >
            <GitHubLogoIcon className="mr-4 scale-125" />
            Sign in with Github
          </CtaButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
