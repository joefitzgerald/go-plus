'use babel'

import {CompositeDisposable} from 'atom'
import GoInformationView from './components/go-information-view'
import {GoInformation} from './go-information'
import {PanelManager} from './panel-manager'

export default {
  dependenciesInstalled: null,
  goconfig: null,
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
    let goInformation = new GoInformation(() => {
      return this.getGoconfig()
    })
    this.subscriptions.add(goInformation)
    this.subscriptions.add(this.getPanelManager().registerViewProvider(GoInformationView, goInformation))
  },

  deactivate () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.statusBar = null
    this.goconfig = null
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

  getGoconfig () {
    if (this.goconfig) {
      return this.goconfig
    }
    return false
  },

  consumeStatusBar (service) {
    this.statusBar = service
    this.getPanelManager().showStatusBar()
  },

  consumeViewProvider (provider) {
    if (!provider || !provider.view || !provider.model || !provider.model.key) {
      return
    }
    let view = provider.view
    let model = provider.model
    this.getPanelManager().registerViewProvider(view, model)
  },

  consumeGoconfig (service) {
    this.goconfig = service
  }
}
