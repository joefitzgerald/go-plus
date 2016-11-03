'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import GoPlusPanel from './components/go-plus-panel'
import GoPlusStatusBar from './components/go-plus-status-bar'

class PanelManager {
  constructor (statusBarFunc, goconfig) {
    this.statusBar = statusBarFunc
    this.goconfig = goconfig
    this.activeItem = 'go'
    this.subscriptions = new CompositeDisposable()
    this.viewProviders = new Map()
    this.resizeSubscriptions = new CompositeDisposable()
    this.subscribeToConfig()
    this.goPlusPanel = new GoPlusPanel({model: this})
    this.subscriptions.add(this.goPlusPanel)
    this.panelVisible = false
    this.panelDisplayMode = atom.config.get('go-plus.panelDisplayMode')
    if (this.panelDisplayMode === 'open') {
      this.panelVisible = true
    }
    this.panel = atom.workspace.addFooterPanel({item: this.goPlusPanel, visible: this.panelVisible, priority: -1000})
    this.subscribeToCommands()
  }

  isVisible () {
    return this.panelVisible
  }

  requestUpdate () {
    if (this.goPlusPanel) {
      this.goPlusPanel.update()
    }
  }

  subscribeToConfig () {
    this.subscriptions.add(atom.config.observe('editor.fontFamily', (v) => {
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('editor.fontSize', (v) => {
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('editor.lineHeight', (v) => {
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.maxPanelHeight', (maxPanelHeight) => {
      this.maxPanelHeight = maxPanelHeight
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.minPanelHeight', (minPanelHeight) => {
      this.minPanelHeight = minPanelHeight
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.currentPanelHeight', (currentPanelHeight) => {
      this.currentPanelHeight = currentPanelHeight
      this.requestUpdate()
    }))
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
    if (this.viewProviders) {
      this.viewProviders.clear()
    }
    this.viewProviders = null
    this.statusBar = null
    this.goPlusStatusBar = null
    if (this.goPlusStatusBarTile) {
      this.goPlusStatusBarTile.destroy()
    }
    this.goPlusStatusBarTile = null
    this.goconfig = null
  }

  registerViewProvider (view, model) {
    if (!view || !model || !model.key) {
      return new Disposable()
    }
    let key = model.key
    model.requestFocus = () => {
      this.activeItem = key
      this.showPanel()
    }
    this.viewProviders.set(key, {view, model})
    this.goPlusPanel.update()
    return new Disposable(() => {
      if (this.viewProviders && this.viewProviders.has(key)) {
        this.viewProviders.delete(key)
      }
    })
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
