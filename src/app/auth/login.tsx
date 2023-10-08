import React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CtaButton } from "@/components/ui/cta-button";
import { Logo } from '@/components/ui/logo';

type LoginProps = {
  children: React.ReactNode;
};

export const LoginDialog = ({ children }: LoginProps) => {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const signInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
    });
    router.refresh();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle></DialogTitle>
          <DialogDescription className="text-center flex flex-col justify-center items-center">
            <Logo variant='short' />
            <p className="mt-8 font-semibold text-3xl">
              Create an account
            </p>
            <p className="mt-4 text-base font-normal">
              Create, manage and share code snippets with Jolly Code.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <CtaButton label='Sign in with Github' type="submit" onClick={signInWithGithub}>
            <GitHubLogoIcon className="mr-4 scale-125" />
            Sign in with Github
          </CtaButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
