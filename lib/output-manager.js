// @flow
'use babel'

import type {PanelModel, Tab} from './panel/tab'

class OutputManager implements PanelModel {
  key: string
  tab: Tab
  output: string
  props: Object
  view: any
  requestFocus: ?() => Promise<void>

  constructor () {
    this.key = 'output'
    this.tab = {
      name: 'Output',
      packageName: 'go-plus',
      icon: 'check',
      order: 200
    }
    this.output = ''
  }

  update (props: Object) {
    const oldProps = this.props
    this.props = Object.assign({}, oldProps, props)

    const {exitcode = 0} = this.props
    if (exitcode !== 0 && this.requestFocus) {
      if (atom.config.get('go-plus.panel.focusOnFailure') && this.requestFocus) {
        this.requestFocus()
      }
    }

    if (this.view) {
      this.view.update()
    }
  }
}

export {OutputManager}
