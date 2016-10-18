'use babel'

import {CompositeDisposable} from 'atom'
import GoInformationView from './components/go-information-view'
import {GoInformation} from './go-information'
import {PanelManager} from './panel-manager'
import {Formatter} from './formatter'
import {Tester} from './tester'
import TestPanel from './components/test-panel'
import {TestPanelManager} from './test-panel-manager'
import {ToolChecker} from './tool-checker'

export default {
  dependenciesInstalled: null,
  goconfig: null,
  panelManager: null,
  statusBar: null,
  subscriptions: null,
  tester: null,
  testPanelManager: null,
  toolChecker: null,
  toolsRegistered: null,
  formatter: null,

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

    this.getFormatter()
    this.getTestPanelManager()
    this.getTester()
    this.consumeViewProvider({
      view: TestPanel,
      model: this.getTestPanelManager()
    })
    this.uninstallOldPackages()
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
    this.toolChecker = null
    this.toolsRegistered = null
    this.formatter = null
    this.tester = null
    this.testPanelManager = null
  },

  uninstallOldPackages () {
    // remove old packages that have been merged into go-plus
    let pkgs = [ 'gofmt', 'tester-go' ]
    for (let pkg of pkgs) {
      let p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      console.log(`removing package ${pkg}`)
      atom.packages.activatePackage('settings-view').then((pack) => {
        if (pack && pack.mainModule) {
          let settingsview = pack.mainModule.createSettingsView({uri: pack.mainModule.configUri})
          settingsview.packageManager.uninstall({name: pkg}, (error) => {
            if (!error) {
              console.log(`the ${pkg} package has been uninstalled`)
              atom.notifications.addInfo(`Removed the ${pkg} package, which is now provided by go-plus`)
            } else {
              console.log(error)
            }
          })
        }
      })
    }
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

  getGoget () {
    if (this.goget) {
      return this.goget
    }
    return false
  },

  getFormatter () {
    if (this.formatter) {
      return this.formatter
    }
    this.formatter = new Formatter(
      () => { return this.getGoconfig() },
      () => { return this.getGoget() })
    this.subscriptions.add(this.formatter)
    return this.formatter
  },

  getTester () {
    if (this.tester) {
      return this.tester
    }
    this.tester = new Tester(() => {
      return this.getGoconfig()
    }, () => {
      return this.getGoget()
    }, () => {
      return this.getTestPanelManager()
    })
    this.subscriptions.add(this.tester)
    return this.tester
  },

  getTestPanelManager () {
    if (this.testPanelManager) {
      return this.testPanelManager
    }
    this.testPanelManager = new TestPanelManager()
    this.subscriptions.add(this.testPanelManager)
    return this.testPanelManager
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
    if (this.formatter) {
      this.formatter.updateFormatterCache()
    }
  },

  consumeGoget (service) {
    this.goget = service
    this.registerTools()
    if (!this.toolChecker) {
      this.toolChecker = new ToolChecker(() => {
        return this.getGoconfig()
      }, () => {
        return this.getGoget()
      })
      this.subscriptions.add(this.toolChecker)
    }
    this.toolChecker.checkForTools(['cover', 'goimports', 'goreturns', 'gometalinter', 'gocode', 'gogetdoc', 'gorename', 'godef'])
  },

  registerTools () {
    if (this.toolsRegistered || !this.goget) {
      return
    }
    this.subscriptions.add(this.goget.register('github.com/nsf/gocode'))
    this.subscriptions.add(this.goget.register('github.com/alecthomas/gometalinter'))
    this.subscriptions.add(this.goget.register('github.com/zmb3/gogetdoc'))
    this.subscriptions.add(this.goget.register('github.com/rogpeppe/godef'))
    this.subscriptions.add(this.goget.register('golang.org/x/tools/cmd/goimports'))
    this.subscriptions.add(this.goget.register('github.com/sqs/goreturns'))
    this.subscriptions.add(this.goget.register('golang.org/x/tools/cmd/cover'))
    this.toolsRegistered = true
  }
}
