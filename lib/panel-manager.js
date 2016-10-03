'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import GoPlusPanel from './components/go-plus-panel'
import GoPlusStatusBar from './components/go-plus-status-bar'

class PanelManager {
  constructor (statusBarFunc) {
    this.statusBar = statusBarFunc
    this.subscriptions = new CompositeDisposable()
    this.goPlusPanel = new GoPlusPanel({
      togglePanel: () => {
        this.togglePanel()
      },
      showPanel: () => {
        this.showPanel()
      },
      hidePanel: () => {
        this.hidePanel()
      },
      isVisible: () => {
        return this.panelVisible
      }
    })
    this.subscriptions.add(this.goPlusPanel)
    this.panelVisible = false
    this.panelDisplayMode = atom.config.get('go-plus.panelDisplayMode')
    if (this.panelDisplayMode === 'open') {
      this.panelVisible = true
    }
    this.panel = atom.workspace.addFooterPanel({item: this.goPlusPanel, visible: this.panelVisible, priority: -1000})
    this.subscribeToCommands()
  }

  subscribeToCommands () {
    if (!this.subscriptions) {
      return
    }
    this.subscriptions.add(atom.commands.add('atom-workspace', 'core:cancel', () => {
      this.hidePanel()
    }))
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:toggle-panel', () => {
      this.togglePanel()
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

  registerViewProvider (view, model) {
    if (!this.goPlusPanel || !view || !model) {
      return new Disposable()
    }

    return this.goPlusPanel.registerViewProvider(view, model)
  }

  togglePanel () {
    if (this.panelVisible) {
      this.hidePanel()
    } else {
      this.showPanel()
    }
  }

  hidePanel () {
    if (!this.panel) {
      return
    }

    this.panel.hide()
    this.panelVisible = false

    if (this.panel.item.props && this.panel.item.props.viewProviders) {
      for (let {model} of this.panel.item.props.viewProviders.values()) {
        if (model.isActive) {
          model.isActive(false)
        }
      }
    }
  }

  showPanel () {
    if (!this.panel) {
      return
    }

    this.panel.show()
    this.panelVisible = true

    if (this.goPlusPanel) {
      this.goPlusPanel.update()
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

    this.goPlusStatusBar = new GoPlusStatusBar({
      togglePanel: () => {
        this.togglePanel()
      }
    })
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
