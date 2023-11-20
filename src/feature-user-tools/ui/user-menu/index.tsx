import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';

export const UserMenu = ({
  username,
  imageUrl,
  onSignOut,
}: {
  username: string;
  imageUrl?: string;
  onSignOut: () => void;
}) => {
  return (
    <DropdownMenu>
      <Tooltip
        content={username || ""}
        align="end"
        side="right"
        sideOffset={12}
      >
        <DropdownMenuTrigger className="focus:outline-none">
          <Avatar username={username} imageSrc={imageUrl} alt={username} />
        </DropdownMenuTrigger>
      </Tooltip>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <i className="mr-2">👋</i> {username}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onSignOut}>
          <div className="flex items-center">
            <i className="ri-logout-circle-fill text-lg mr-3" />
            Logout
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
