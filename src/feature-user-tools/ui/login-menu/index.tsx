import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { LoginDialog } from '@/feature-login';

export const LoginMenu = () => {
  return (
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
  );
};
