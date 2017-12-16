// @flow
'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import GoPlusPanel, {PANEL_URI} from './go-plus-panel'
import GoPlusStatusBar from './go-plus-status-bar'

import type {PanelModel} from './tab'
import type {GoConfig} from './../config/service'

type IDisposable = {
  dispose: () => void
}

type StatusBarTile = {
  getPriority: () => number,
  getItem: () => any,
  destroy: () => void
}

type StatusBar = {
  addLeftTile: ({item: any, priority: number}) => void,
  addRightTile: ({item: any, priority: number}) => void,
  getLeftTiles: Array<StatusBarTile>,
  getRightTiles: Array<StatusBarTile>
}

class PanelManager {
  activeItem: string
  item: {
    element?: any,
    getURI: () => string,
    getTitle: () => string,
    getIconName: () => string,
    getDefaultLocation: () => string,
    getAllowedLocations: () => string[]
  }
  subscriptions: CompositeDisposable
  viewProviders: Map<string, {view: any, model: PanelModel}>
  goPlusPanel: GoPlusPanel
  statusBar: () => StatusBar | false
  goconfig: GoConfig
  goPlusStatusBar: GoPlusStatusBar
  goPlusStatusBarTile: ?StatusBarTile

  constructor (statusBarFunc: () => StatusBar | false) {
    this.statusBar = statusBarFunc
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

  createPanel (visible: bool): Promise<void> {
    if (this.goPlusPanel) {
      this.goPlusPanel.destroy()
    }
    this.goPlusPanel = new GoPlusPanel({model: this})
    this.item.element = this.goPlusPanel.element
    return atom.workspace.open(this.item, {
      activatePane: visible
    }).then(() => this.requestUpdate())
  }

  requestUpdate (): Promise<void> {
    if (this.goPlusPanel) {
      return this.goPlusPanel.update()
    }
    return Promise.resolve()
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

    const pane = atom.workspace.paneForURI(PANEL_URI)
    if (pane) {
      pane.destroyItem(this.item)
    }

    if (this.goPlusPanel) {
      this.goPlusPanel.destroy()
    }
    this.goPlusPanel = null
    this.viewProviders.clear()

    this.goPlusStatusBar = null
    if (this.goPlusStatusBarTile) {
      this.goPlusStatusBarTile.destroy()
    }
    this.goPlusStatusBarTile = null
  }

  registerViewProvider (view: any, model: PanelModel): IDisposable {
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

  togglePanel (visible?: bool): Promise<void> {
    const container = atom.workspace.paneContainerForURI(PANEL_URI)
    if (!container) {
      return this.createPanel(true)
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
      return Promise.resolve()
    }
    container.show()
    pane.activateItemForURI(PANEL_URI)

    if (this.goPlusPanel) {
      return this.goPlusPanel.update()
    } else {
      return Promise.resolve()
    }
  }

  showStatusBar () {
    if (this.goPlusStatusBar) {
      return
    }

    this.goPlusStatusBar = new GoPlusStatusBar({
      togglePanel: () => { this.togglePanel() }
    })

    this.subscriptions.add(this.goPlusStatusBar)

    if (this.goPlusStatusBarTile) {
      this.goPlusStatusBarTile.destroy()
    }

    const sb = this.statusBar()
    if (sb) {
      this.goPlusStatusBarTile = sb.addRightTile({
        item: this.goPlusStatusBar,
        priority: 1000
      })
    }
  }
}

export {PanelManager}
