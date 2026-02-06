import { useEffect, useMemo, useRef } from "react";

import { useOthers, useSelf } from "../../../../liveblocks.config";
import { Tooltip } from "../tooltip";
import { Avatar } from "../avatar";

const UsersPresence = () => {
  const currentUser = useSelf();
  const users = useOthers();

  const filteredUsers = useMemo(() => {
    const currentUserId = currentUser?.id;

    // Filter out duplicate connections from the same user (whether authenticated or anonymous)
    // Using Set-based approach for O(n) time complexity instead of O(n²)
    const seenIds = new Set<string>();
    const uniqueUsers: Array<typeof users[number]> = [];
    
    for (const user of users) {
      if (!seenIds.has(user.id)) {
        seenIds.add(user.id);
        uniqueUsers.push(user);
      }
    }

    // If current user is authenticated, also filter out their own connections
    if (currentUserId && currentUserId !== "anonymous") {
      return uniqueUsers.filter((user) => user.id !== currentUserId);
    }

    // For anonymous users, just return the unique users (no self-filtering needed)
    return uniqueUsers;
  }, [currentUser?.id, users]);

  const userCount = filteredUsers.length;
  const hasMoreUsers = filteredUsers.length > 3;

  /**
   * Generates a random color.
   *
   * @return {string} The randomly generated hexadecimal color.
   */
  function generateRandomColor() {
    // Generate a random hexadecimal number
    var randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
  }

  // Initialize as null to avoid hydration mismatch
  const avatarBackgroundColorRef = useRef<string | null>(null);

  // Generate color only on client side after mount
  useEffect(() => {
    if (!avatarBackgroundColorRef.current) {
      avatarBackgroundColorRef.current = generateRandomColor();
    }
  }, []);

  return (
    <div className="flex pr-3 space-x-1">
      {filteredUsers.slice(0, 3).map(({ connectionId, info }: any) => {
        return (
          <Tooltip key={connectionId} content={"Anonymous"}>
            <div>
              <Avatar
                imageSrc={info.avatar_url || undefined}
                username={info.name || "Anonymous"}
                color={avatarBackgroundColorRef.current || undefined}
                size="md"
              />
            </div>
          </Tooltip>
        );
      })}

      {hasMoreUsers && (
        <Tooltip content={`More ${userCount - 3} users`}>
          <Avatar
            username={(userCount - 3).toString()}
            variant="other-user"
            size="md"
          />
        </Tooltip>
      )}

      {currentUser && (
        <Tooltip content="You">
          <div className="relative">
            <Avatar
              imageSrc={(currentUser.info as { avatar_url: string }).avatar_url}
              username="You"
              size="md"
              color={avatarBackgroundColorRef.current || undefined}
            />
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default UsersPresence;
