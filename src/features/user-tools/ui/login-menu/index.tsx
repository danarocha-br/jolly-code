import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { LoginDialog } from '@/features/login';

export const LoginMenu = () => {
  return (
    <LoginDialog>
      <Button size="icon" variant="ghost" className="not-dark:hover:bg-subdued">
        <HoverCard>
          <HoverCardTrigger asChild>
            <i className="ri-user-smile-fill text-lg" />
          </HoverCardTrigger>

          <HoverCardContent side="left" sideOffset={12}>
            Register or Login
          </HoverCardContent>
        </HoverCard>
      </Button>
    </LoginDialog>
  );
};
