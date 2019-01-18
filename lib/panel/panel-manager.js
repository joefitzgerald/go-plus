// @flow

import { CompositeDisposable, Disposable } from 'atom'
import { GoPlusPanel, PANEL_URI } from './go-plus-panel'

import type { PanelModel } from './tab'
import type { GoConfig } from './../config/service'
import type { Renderable } from '../etch-component'

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
  viewProviders: Map<string, { view: Class<Renderable>, model: PanelModel }>
  goPlusPanel: ?GoPlusPanel
  goconfig: GoConfig

  constructor() {
    this.activeItem = 'go'

    this.item = {
      getURI: () => PANEL_URI,
      getTitle: () => 'go-plus',
      getIconName: () => 'diff-added',
      getDefaultLocation: () => 'bottom',
      getAllowedLocations: () => ['right', 'left', 'bottom']
    }

    this.subscriptions = new CompositeDisposable()
    this.viewProviders = new Map()

    this.subscribeToCommands()
  }

  createPanel(visible: boolean): Promise<void> {
    if (this.goPlusPanel) {
      this.goPlusPanel.destroy()
    }
    this.goPlusPanel = new GoPlusPanel({ model: this })
    this.item.element = this.goPlusPanel.element
    //$FlowFixMe
    return atom.workspace
      .open(this.item, {
        activatePane: visible
      })
      .then(() => this.requestUpdate())
  }

  requestUpdate(): Promise<void> {
    if (this.goPlusPanel) {
      return this.goPlusPanel.update()
    } else {
      return this.createPanel(
        atom.config.get('go-plus.panel.displayMode') === 'open'
      )
    }
  }

  subscribeToCommands() {
    if (!this.subscriptions) {
      return
    }
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'golang:toggle-panel', () => {
        this.togglePanel()
      })
    )
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }

    const pane = atom.workspace.paneForURI(PANEL_URI)
    if (pane) {
      pane.destroyItem(this.item)
    }

    if (this.goPlusPanel) {
      this.goPlusPanel.destroy()
    }
    this.goPlusPanel = null
    this.viewProviders.clear()
  }

  registerViewProvider(view: Class<Renderable>, model: PanelModel): Disposable {
    if (!view || !model || !model.key) {
      return new Disposable()
    }
    const key = model.key
    model.requestFocus = () => {
      this.activeItem = key
      return this.togglePanel(true)
    }
    this.viewProviders.set(key, { view, model })
    if (this.goPlusPanel) {
      this.goPlusPanel.update()
    }

    return new Disposable(() => {
      if (this.viewProviders && this.viewProviders.has(key)) {
        this.viewProviders.delete(key)
      }
    })
  }

  togglePanel(visible?: boolean): Promise<void> {
    //$FlowFixMe
    const container = atom.workspace.paneContainerForURI(PANEL_URI)
    if (!container) {
      return this.createPanel(true)
    }

    const pane = atom.workspace.paneForURI(PANEL_URI)
    if (visible === undefined) {
      const currentlyVisible =
        container.isVisible() && pane && pane.getActiveItem() === this.item
      visible = !currentlyVisible
    }

    if (!visible) {
      container.hide()
      for (const { model } of this.viewProviders.values()) {
        if (model.isActive) {
          model.isActive(false)
        }
      }
      return Promise.resolve()
    }
    container.show()
    //$FlowFixMe
    pane.activateItemForURI(PANEL_URI)

    if (this.goPlusPanel) {
      return this.goPlusPanel.update()
    } else {
      return Promise.resolve()
    }
  }
}

export { PanelManager }
