'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import GoPlusPanel, {PANEL_URI} from './go-plus-panel'
import GoPlusStatusBar from './go-plus-status-bar'

class PanelManager {
  constructor (statusBarFunc, goconfig) {
    this.statusBar = statusBarFunc
    this.goconfig = goconfig
    this.activeItem = 'go'

    this.item = {
      getURI: () => PANEL_URI,
      getTitle: () => 'go-plus',
      getIconName: () => 'diff-added',
      getDefaultLocation: () => 'bottom',
      getAllowedLocations: () => [ 'right', 'left', 'bottom' ]
    }

    this.subscriptions = new CompositeDisposable()
    this.viewProviders = new Map()

    this.subscribeToConfig()

    this.createPanel(atom.config.get('go-plus.panel.displayMode') === 'open')
    this.subscribeToCommands()
  }

  createPanel (visible) {
    if (this.goPlusPanel) {
      this.goPlusPanel.destroy()
    }
    this.goPlusPanel = new GoPlusPanel({model: this})
    this.item.element = this.goPlusPanel.element
    return atom.workspace.open(this.item, {
      activatePane: visible
    }).then(() => this.requestUpdate())
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
  }

  subscribeToCommands () {
    if (!this.subscriptions) {
      return
    }
    this.subscriptions.add(atom.commands.add('atom-workspace', 'golang:toggle-panel', () => {
      this.togglePanel()
    }))
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.item = null

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
      return this.togglePanel(true)
    }
    this.viewProviders.set(key, {view, model})
    if (this.goPlusPanel) {
      this.goPlusPanel.update()
    }

    return new Disposable(() => {
      if (this.viewProviders && this.viewProviders.has(key)) {
        this.viewProviders.delete(key)
      }
    })
  }

  togglePanel (visible) {
    const container = atom.workspace.paneContainerForURI(PANEL_URI)
    if (!container) {
      this.createPanel(true)
      return
    }

    const pane = atom.workspace.paneForURI(PANEL_URI)
    if (visible === undefined) {
      const currentlyVisible = container.isVisible() && pane && pane.getActiveItem() === this.item
      visible = !currentlyVisible
    }

    if (!visible) {
      container.hide()
      if (this.goPlusPanel.props && this.goPlusPanel.props.viewProviders) {
        for (const {model} of this.goPlusPanel.props.viewProviders.values()) {
          if (model.isActive) {
            model.isActive(false)
          }
        }
      }
    } else {
      container.show()
      pane.activateItemForURI(PANEL_URI)

      if (this.goPlusPanel) {
        return this.goPlusPanel.update()
      } else {
        return Promise.resovle()
      }
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
