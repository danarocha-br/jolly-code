import React, { useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

import { Card, CardContent } from "../components/ui/card";
import { useEditorStore, useUserStore } from "@/app/store";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { EditorOptionsMenu } from "./ui/editor-options-menu";
import { Tooltip } from "../components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CodeAnnotationMenu } from "./ui/code-annotation-menu";
import { HotKeysPopover } from "./ui/hotkeys-menu";
import { UserMenu } from "./ui/user-menu";
import { LoginMenu } from "./ui/login-menu";

import * as S from "./ui/styles";
import { Changelog } from '@/feature-changelog';

export const UserTools = () => {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useUserStore();

  const queryClient = useQueryClient();
  const queryKey = ["user"];

  const username = useMemo(() => user?.user_metadata?.full_name, [user]);
  const imageUrl = useMemo(() => user?.user_metadata?.avatar_url, [user]);

  const handleSignOut = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
      useUserStore.setState({ user: null });
      useEditorStore.getState().resetIsSnippetSaved();
      useEditorStore.getState().resetEditors();
    },
    onSuccess: () => {
      toast.message("👋 See you soon!");
      router.refresh();
    },
    onError: () => {
      toast.error("Sorry, something went wrong.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <Card className={S.container()}>
      <CardContent className={S.content()}>
        {!!user && username ? (
          <UserMenu
            username={username}
            imageUrl={imageUrl}
            onSignOut={handleSignOut.mutate}
          />
        ) : (
          <LoginMenu />
        )}

        <Separator />

        <EditorOptionsMenu />

        <CodeAnnotationMenu />

        <HotKeysPopover />

        <Separator />

        <Changelog>
          <Button size="icon" variant="ghost">
            <Tooltip
              content="Feedback & Updates"
              align="end"
              side="right"
              sideOffset={12}
            >
              <i className="ri-question-line text-lg" />
            </Tooltip>
          </Button>
        </Changelog>
      </CardContent>
    </Card>
  );
};
