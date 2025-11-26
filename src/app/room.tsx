"use client";

import { User } from "@supabase/supabase-js";
import { ReactNode, useEffect, useMemo } from "react";
import { ClientSideSuspense } from "@liveblocks/react";

import { RoomProvider } from "../../liveblocks.config";
import { useParams } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useUserStore } from "./store";

export function Room({
  children,
  user,
}: {
  children: ReactNode;
  user: User | null;
}) {
  function useOverrideRoomId(roomId: string) {
    const query = useParams();
    const overrideRoomId = useMemo(() => {
      return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
    }, [query, roomId]);

    return overrideRoomId;
  }

  const roomId = useOverrideRoomId("jollycode");

  useEffect(() => {
    if (user) {
      useUserStore.setState({ user });
    }
  }, [user]);

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ClientSideSuspense
        fallback={
          <div className="min-h-screen w-full flex justify-center items-center">
            <Logo
              variant="short"
              className="animate-pulse grayscale duration-[0.75s]"
            />
          </div>
        }
      >
        {() => <>{children}</>}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
