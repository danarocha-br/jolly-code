import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  // publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_API_KEY,
  authEndpoint: "/api/liveblocks-auth",
  // throttle: 100,
});

// JSON-serializable type matching Liveblocks' Json type constraint
type Json = JsonScalar | JsonArray | JsonObject;
type JsonScalar = string | number | boolean | null;
type JsonArray = Json[];
type JsonObject = {
  [key: string]: Json | undefined;
};

// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  // cursor: { x: number, y: number } | null,
  // ...
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // author: LiveObject<{ firstName: string, lastName: string }>,
  // ...
};

// Optionally, UserMeta represents static/readonly metadata on each user, as
// provided by your own custom auth back end (if used). Useful for data that
// will not change during a session, like a user's name or avatar.
// Note: info must be JSON-serializable per Liveblocks' Json type constraint
type UserMeta = {
  id: string;  // Accessible through `user.id` - always present (user ID or "anonymous")
  info?: JsonObject;  // Accessible through `user.info` - must be JSON-serializable
};

// Optionally, the type of custom events broadcast and listened to in this
// room. Use a union for multiple events. Must be JSON-serializable.
type RoomEvent = {
  // type: "NOTIFICATION",
  // ...
};

export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useEventListener,
    useErrorListener,
    useBatch,
    useHistory,
    useStatus,
  }
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
