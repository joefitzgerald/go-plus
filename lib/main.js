'use babel'

import {CompositeDisposable} from 'atom'
import {PanelManager} from './panel-manager'

export default {
  dependenciesInstalled: null,
  panelManager: null,
  statusBar: null,
  subscriptions: null,

  activate () {
    this.subscriptions = new CompositeDisposable()
    require('atom-package-deps').install('go-plus').then(() => {
      this.dependenciesInstalled = true
      return this.dependenciesInstalled
    }).catch((e) => {
      console.log(e)
    })

    this.subscriptions.add(this.getPanelManager())
  },

  deactivate () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.statusBar = null
    this.panelManager = null
    this.dependenciesInstalled = null
  },

  getPanelManager () {
    if (this.panelManager) {
      return this.panelManager
    }
    this.panelManager = new PanelManager(() => {
      return this.getStatusBar()
    })
    this.subscriptions.add(this.panelManager)
    return this.panelManager
  },

  getStatusBar () {
    if (this.statusBar) {
      return this.statusBar
    }
    return false
  },

  consumeStatusBar (service) {
    this.statusBar = service
    this.getPanelManager().showStatusBar()
  },

  consumeViewProvider (provider) {
    this.getPanelManager().registerViewProvider(provider)
  }
}
