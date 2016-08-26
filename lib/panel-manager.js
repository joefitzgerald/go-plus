'use babel'

import {CompositeDisposable} from 'atom'
import GoPlusPanel from './components/go-plus-panel'
import GoPlusStatusBar from './components/go-plus-status-bar'

class PanelManager {
  constructor (statusBarFunc) {
    this.statusBar = statusBarFunc
    this.subscriptions = new CompositeDisposable()
    this.goPlusPanel = new GoPlusPanel({toggle: () => this.togglePanel()})
    this.subscriptions.add(this.goPlusPanel)
    this.panelVisible = false
    this.panel = atom.workspace.addBottomPanel({item: this.goPlusPanel, visible: this.panelVisible, priority: 10})
    this.subscriptions.add(atom.config.observe('go-plus.panelDisplayMode', (panelDisplayMode) => {
      this.panelDisplayMode = panelDisplayMode
    }))
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    if (this.panel) {
      this.panel.destroy()
    }
    this.panel = null
    this.goPlusPanel = null
    this.statusBar = null
    this.goPlusStatusBar = null
    if (this.goPlusStatusBarTile) {
      this.goPlusStatusBarTile.destroy()
    }
    this.goPlusStatusBarTile = null
  }

  togglePanel () {
    if (!this.panel) {
      return
    }

    if (this.panelVisible) {
      this.panel.hide()
      this.panelVisible = false
    } else {
      this.panel.show()
      this.panelVisible = true
    }
  }

  update (props) {
    if (!props) {
      return
    }
    let icon = 'light-bulb'
    if (props.exitcode && props.exitcode !== 0) {
      icon = 'remove-close'
    } else if (props.exitcode === 0) {
      icon = 'check'
    }

    if (props.state && this.testStatusBar) {
      this.testStatusBar.update({state: props.state, icon: icon})
    }

    if (props.output && props.output.length > 0 && this.testPanel) {
      this.testPanel.update({testOutput: props.output})
    }

    if (this.displayTestOutputPanel === 'always') {
      this.panel.show()
      this.panelVisible = true
      return
    }

    if (props.exitcode && props.exitcode !== 0 && this.displayTestOutputPanel === 'failure-only') {
      this.panel.show()
      this.panelVisible = true
      return
    }

    if (props.exitcode === 0 && this.displayTestOutputPanel === 'success-only') {
      this.panel.show()
      this.panelVisible = true
      return
    }
  }

  showStatusBar () {
    if (this.goPlusStatusBar || !this.statusBar()) {
      return
    }

    this.goPlusStatusBar = new GoPlusStatusBar({toggle: () => this.togglePanel()})
    this.subscriptions.add(this.goPlusStatusBar)

    if (this.goPlusStatusBarTile) {
      this.goPlusStatusBarTile.destroy()
    }

    this.goPlusStatusBarTile = this.statusBar().addRightTile({
      item: this.goPlusStatusBar,
      priority: 1000
    })
  }
}
export {PanelManager}
