import React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

import * as S from "./styles";
import { Card, CardContent } from "../../ui/card";
import { Avatar } from "../../ui/avatar";
import { useUserSettingsStore } from "@/app/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/../dropdown-menu";
import { useRouter } from "next/navigation";
import { Button } from "../ui/../button";
import { LoginDialog } from "@/app/auth/login";
import { Separator } from "../ui/../separator";
import { EditorOptionsMenu } from "./editor-options-menu";
import { Tooltip } from "../ui/../tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";

export const UserTools: React.FC = () => {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const user = useUserSettingsStore((state) => state.user);

  const username = user?.user_metadata.full_name;
  const imageUrl = user?.user_metadata.avatar_url;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      useUserSettingsStore.setState({ user: null });

      toast.message("See you soon!");
      router.refresh();
    } catch (error) {
      toast.error("Sorry, something went wrong.");
    }
  };

  return (
    <Card className={S.container()}>
      <CardContent className={S.content()}>
        {user ? (
          <>
            <DropdownMenu>
              <Tooltip
                content={username}
                align="end"
                side="right"
                sideOffset={12}
              >
                <DropdownMenuTrigger className="focus:outline-none">
                  <Avatar
                    username={username}
                    imageSrc={imageUrl}
                    alt={username}
                  />
                </DropdownMenuTrigger>
              </Tooltip>

              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <i className="mr-2">👋</i> {username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    handleSignOut();
                  }}
                >
                  <i className="ri-logout-circle-fill text-lg mr-3" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          //TODO: Create the hover card view to sign in
          <LoginDialog>
            <Button size="icon" variant="ghost">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <svg
                    width="23"
                    height="23"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-foreground scale-[0.75]"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M11.452 0h.048c6.307.052 11.404 5.18 11.404 11.5S17.807 22.948 11.5 23h-.096C5.097 22.948 0 17.82 0 11.5S5.097.052 11.404 0h.048Zm.048 6.726v9.765h.013a4.882 4.882 0 0 0 0-9.765H11.5Z"
                    />
                  </svg>
                </HoverCardTrigger>

                <HoverCardContent side="left" sideOffset={12}>
                  Register or Login
                </HoverCardContent>
              </HoverCard>
            </Button>
          </LoginDialog>
        )}

        <Separator />

        <EditorOptionsMenu />

        <Tooltip content="Comment" align="end" side="right" sideOffset={10}>
          <Button size="icon" variant="ghost">
            <i className="ri-chat-1-line text-lg" />
          </Button>
        </Tooltip>

        <Separator />

        <Tooltip content="Shortcuts" align="end" side="right" sideOffset={10}>
          <Button size="icon" variant="ghost">
            <i className="ri-keyboard-line text-lg" />
          </Button>
        </Tooltip>
      </CardContent>
    </Card>
  );
};
