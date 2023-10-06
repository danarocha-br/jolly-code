import React from "react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

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
          <DialogDescription className="text-center">
            <span className="text-xl mt-6 text-white">𝐉𝐨ℓℓ𝐲 𝐂𝐨𝐝𝐞</span>
            <p className="mt-8 font-semibold text-transparent text-3xl bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300  to-amber-500">
              Create an account
            </p>
            <p className="mt-4 text-base font-normal">
              Create, manage and share code snippets with Jolly Code.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            type="submit"
            size="lg"
            variant="outline"
            onClick={signInWithGithub}
          >
            <GitHubLogoIcon className="mr-4 scale-125" />
            Sign in with Github
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
