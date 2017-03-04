'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import GoPlusPanel from './go-plus-panel'
import GoPlusStatusBar from './go-plus-status-bar'

class PanelManager {
  constructor (statusBarFunc, goconfig) {
    this.statusBar = statusBarFunc
    this.goconfig = goconfig
    this.activeItem = 'go'
    this.subscriptions = new CompositeDisposable()
    this.viewProviders = new Map()
    this.resizeSubscriptions = new CompositeDisposable()
    this.initialized = false
    this.activated = false
    this.subscribeToConfig()
    this.panelDisplayMode = atom.config.get('go-plus.panelDisplayMode')
    this.panelVisible = false
    if (this.panelDisplayMode === 'open') {
      this.panelVisible = true
    }
    this.subscribeToCommands()
    this.initialized = true
    this.refreshPanel(atom.config.get('go-plus.panelOrientation'))
  }

  setActivated () {
    this.activated = true
    this.refreshPanel(atom.config.get('go-plus.panelOrientation'))
  }

  refreshPanel (panelOrientation) {
    if (!this.initialized | !this.activated) {
      return
    }
    if (this.panelOrientation && panelOrientation && panelOrientation === this.panelOrientation) {
      return
    }

    this.panelOrientation = panelOrientation
    if (this.panel) {
      this.panel.destroy()
    }
    if (this.goPlusPanel) {
      this.goPlusPanel.destroy()
    }
    this.goPlusPanel = new GoPlusPanel({model: this})
    if (this.panelOrientation === 'horizontal') {
      this.panel = atom.workspace.addFooterPanel({item: this.goPlusPanel, visible: this.panelVisible, priority: -1000})
    } else {
      this.panel = atom.workspace.addRightPanel({item: this.goPlusPanel, visible: this.panelVisible, priority: -1000})
    }

    this.requestUpdate()
  }

  isVisible () {
    return this.panelVisible
  }

  requestUpdate () {
    if (this.goPlusPanel && this.initialized && this.activated) {
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
    this.subscriptions.add(atom.config.observe('go-plus.maxPanelWidth', (maxPanelWidth) => {
      this.maxPanelWidth = maxPanelWidth
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.minPanelWidth', (minPanelWidth) => {
      this.minPanelWidth = minPanelWidth
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.currentPanelWidth', (currentPanelWidth) => {
      this.currentPanelWidth = currentPanelWidth
      this.requestUpdate()
    }))
    this.subscriptions.add(atom.config.observe('go-plus.panelOrientation', (panelOrientation) => {
      this.refreshPanel(panelOrientation)
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
    if (this.goPlusPanel) {
      this.goPlusPanel.destroy()
    }
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
    const key = model.key
    model.requestFocus = () => {
      this.activeItem = key
      return this.showPanel()
    }
    this.viewProviders.set(key, {view, model})
    if (this.goPlusPanel && this.initialized && this.activated) {
      this.goPlusPanel.update()
    }

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
      for (const {model} of this.panel.item.props.viewProviders.values()) {
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
      return this.goPlusPanel.update()
    } else {
      return Promise.resovle()
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
