import React, { useCallback } from "react";
import { itemContainer } from './styles';

type SettingsPanelItemProps = {
  children: React.ReactNode;
  value: string;
  onClick?: () => void;
  role?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: boolean | "dialog" | "menu" | "listbox" | "tree" | "grid" | "true" | "false";
  tabIndex?: number;
};

export const SettingsPanelItem = ({
  children,
  value,
  onClick,
  role,
  "aria-expanded": ariaExpanded,
  "aria-haspopup": ariaHaspopup,
  tabIndex = onClick ? 0 : undefined,
}: SettingsPanelItemProps) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  }, [onClick]);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  const clickableProps = onClick ? {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    tabIndex,
    role: role || "button",
    "aria-expanded": ariaExpanded,
    "aria-haspopup": ariaHaspopup,
    className: itemContainer({ clickable: true }),
  } : {
    className: itemContainer({ clickable: false }),
  };

  return (
    <div {...clickableProps}>
      <span className="truncate text-center w-full rounded-[4px]">{value}</span>
      {children}
    </div>
  );
};
