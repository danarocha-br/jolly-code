"use client";

import { useState } from "react";
import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';
import { UsageStatsWidget } from '@/components/usage-stats-widget';
import { BillingDialog } from '@/components/ui/billing-dialog';
import type { UsageSummary } from '@/lib/services/usage-limits';

export const UserMenu = ({
  username,
  imageUrl,
  onSignOut,
  usage,
  isUsageLoading,
  onUpgrade,
}: {
  username: string;
  imageUrl?: string;
  onSignOut: () => void;
  usage?: UsageSummary;
  isUsageLoading?: boolean;
  onUpgrade?: () => void;
}) => {
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const hasSubscription = Boolean(usage?.plan && usage.plan !== 'free');

  return (
    <>
      <BillingDialog open={isBillingOpen} onOpenChange={setIsBillingOpen} />
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

        <DropdownMenuContent align="center" side="left">
          <DropdownMenuLabel>
            <i className="mr-2">👋</i> {username}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {hasSubscription && (
            <>
              <DropdownMenuItem onClick={() => setIsBillingOpen(true)}>
                <div className="flex items-center">
                  <i className="ri-bill-line text-lg mr-3" />
                  Manage subscription
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={onSignOut}>
            <div className="flex items-center">
              <i className="ri-logout-circle-fill text-lg mr-3" />
              Logout
            </div>
          </DropdownMenuItem>

          {(usage || isUsageLoading) && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <UsageStatsWidget
                  usage={usage}
                  isLoading={isUsageLoading}
                  onUpgrade={onUpgrade}
                  className="w-64"
                />
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
