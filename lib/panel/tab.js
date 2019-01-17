// @flow

export type Tab = {
  key: string,
  name: string,
  packageName: string,
  icon: string,
  order: number,
  className?: string,
  suppressPadding?: boolean
}

export interface PanelModel {
  key: string;
  tab: Tab;
  requestFocus?: ?() => Promise<void>;
  isActive?: ?(active: boolean) => void;
}
