import React from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

import * as S from "./styles";
import { Card, CardContent } from "../ui/card";
import { Avatar } from "../ui/avatar";
import { useUserSettingsStore } from "@/app/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import { LoginDialog } from '@/app/auth/login';

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
      console.error("Error signing out: ", error);
    }
  };

  return (
    <Card className={S.container()}>
      <CardContent className="flex items-center">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Avatar username={username} imageSrc={imageUrl} alt={username} />
            </DropdownMenuTrigger>

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
        ) : (
          <LoginDialog>
            <Button size="icon" variant="ghost">
              <i className="ri-login-circle-fill text-lg" />
            </Button>
          </LoginDialog>
        )}
      </CardContent>
    </Card>
  );
};
