// @flow

import type { PanelModel, Tab } from './panel/tab'
import type { OutputPanel } from './output-panel'

class OutputManager implements PanelModel {
  key: string
  tab: Tab
  output: string
  props: Object
  view: OutputPanel
  requestFocus: ?() => Promise<void>

  constructor() {
    this.key = 'output'
    this.tab = {
      key: 'output',
      name: 'Output',
      packageName: 'go-plus',
      icon: 'check',
      order: 200
    }
    this.output = ''
  }

  update(props: Object) {
    const oldProps = this.props
    this.props = Object.assign({}, oldProps, props)

    const { exitcode = 0 } = this.props
    if (exitcode !== 0 && this.requestFocus) {
      if (
        atom.config.get('go-plus.panel.focusOnFailure') &&
        this.requestFocus
      ) {
        this.requestFocus()
      }
    }

    if (this.view) {
      this.view.update()
    }
  }
}

export { OutputManager }
