import { useEffect, useMemo, useRef } from "react";

import { useOthers, useSelf } from "../../../../liveblocks.config";
import { Tooltip } from "../tooltip";
import { Avatar } from "../avatar";

const UsersPresence = () => {
  const currentUser = useSelf();
  const users = useOthers();

  const filteredUsers = useMemo(() => {
    const currentUserId = currentUser?.id;

    // Keep showing all users when the viewer is anonymous so we don't hide others
    if (!currentUserId || currentUserId === "anonymous") {
      return users;
    }

    // Avoid rendering the logged-in user twice when they have multiple connections open
    return users.filter((user) => user.id !== currentUserId);
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
