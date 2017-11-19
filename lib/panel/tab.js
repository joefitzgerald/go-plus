// @flow

export type Tab = {
  name: string,
  packageName: string,
  icon: string,
  order: ?number
}

export interface PanelModel {
  key: string,
  tab: Tab,
  requestFocus?: ?() => Promise<void>
}
