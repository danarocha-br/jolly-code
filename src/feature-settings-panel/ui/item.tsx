import React from "react";
import { itemContainer } from './styles';

type SettingsPanelItemProps = {
  children: React.ReactNode;
  value: string;
};

export const SettingsPanelItem = ({
  children,
  value,
}: SettingsPanelItemProps) => {
  return (
    <div className={itemContainer()}>
      <span className="truncate text-center w-full rounded-[4px]">{value}</span>
      {children}
    </div>
  );
};
