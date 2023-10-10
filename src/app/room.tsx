"use client";

import { ReactNode, useMemo } from "react";
import { ClientSideSuspense } from "@liveblocks/react";

import { RoomProvider } from "../../liveblocks.config";
import { useParams } from "next/navigation";
import { Logo } from '@/components/ui/logo';

export function Room({ children }: { children: ReactNode }) {
  function useOverrideRoomId(roomId: string) {
    const query = useParams();
    const overrideRoomId = useMemo(() => {
      return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
    }, [query, roomId]);

    return overrideRoomId;
  }

  const roomId = useOverrideRoomId("jollycode");

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
        {() => (
          children
        )}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
