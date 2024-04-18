'use client'
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CtaButton } from "@/components/ui/cta-button";
import { Logo } from "@/components/ui/logo";

type LoginProps = {
  children: React.ReactNode;
};

export const LoginDialog = ({ children }: LoginProps) => {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const previousRoute = window.location.href;
    localStorage.setItem("previousRoute", previousRoute);
  }, []);

  const { mutate: handleSignInWithGithub, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
      });

      let previousRoute = "/";
      if (typeof window !== "undefined") {
        previousRoute = localStorage.getItem("previousRoute") || "/";
      }
      router.push(previousRoute);

      if (error) {
        toast.error("Sorry, something went wrong. Please try again.");
      }
    },
  });

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
            onClick={() => handleSignInWithGithub()}
            isLoading={isPending}
          >
            <GitHubLogoIcon className="mr-4 scale-125" />
            Sign in with Github
          </CtaButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
