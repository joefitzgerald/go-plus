'use babel'

import {CompositeDisposable, Disposable} from 'atom'

const oldPackages = [ 'gofmt', 'tester-go', 'builder-go', 'autocomplete-go', 'go-get', 'go-config', 'godoc', 'gorename' ]

export default {
  formatter: null,
  getManager: null,
  goconfig: null,
  locator: null,
  panelManager: null,
  statusBar: null,
  subscriptions: null,
  tester: null,
  builder: null,
  godoc: null,
  loaded: null,
  gorename: null,

  activate () {
    this.subscriptions = new CompositeDisposable()
    this.loaded = false
    setTimeout(() => {
      this.load()
    }, 1)
  },

  load () {
    this.getGoconfig()
    this.getGoget()
    this.getPanelManager()
    this.loadInformation()
    this.loadFormatter()
    this.loadTester()
    this.loadDoc()
    this.loadGorename()

    this.registerTools()
    const {ToolChecker} = require('./tool-checker')
    if (!this.toolChecker) {
      this.toolChecker = new ToolChecker(this.goconfig)
      this.subscriptions.add(this.toolChecker)
    }
    this.toolChecker.checkForTools(['cover', 'goimports', 'goreturns', 'gometalinter', 'gocode', 'gogetdoc', 'gorename', 'godef'])
    this.disableOldPackages()
    this.willUninstall = true
    this.loaded = true
    setTimeout(() => {
      if (!this.willUninstall) {
        return
      }
      this.uninstallOldPackages()
    }, 10000)
  },

  loadInformation () {
    const InformationView = require('./components/information-view')
    const {Information} = require('./information')
    const information = new Information(this.getGoconfig())
    this.subscriptions.add(information)
    this.subscriptions.add(this.consumeViewProvider({
      view: InformationView,
      model: information,
      allowRegistration: true
    }))
  },

  loadFormatter () {
    if (this.formatter) {
      return
    }
    const {Formatter} = require('./format/formatter')
    this.formatter = new Formatter(this.getGoconfig(), this.getGoget())
    this.subscriptions.add(this.formatter)
  },

  loadTester () {
    const {TestPanelManager} = require('./test/test-panel-manager')
    const testPanelManager = new TestPanelManager()
    this.subscriptions.add(testPanelManager)

    const {Tester} = require('./test/tester')
    this.tester = new Tester(this.getGoconfig(), testPanelManager)
    this.subscriptions.add(this.tester)

    const TestPanel = require('./components/test-panel')
    this.consumeViewProvider({
      view: TestPanel,
      model: testPanelManager,
      allowRegistration: true
    })
  },

  loadDoc () {
    const {Godoc} = require('./doc/godoc')
    this.godoc = new Godoc(this.getGoconfig(), this.getGoget())
    this.subscriptions.add(this.godoc)

    const GodocPanelView = require('./components/godoc-panel-view')
    const GodocPanel = require('./doc/godoc-panel')
    const godocpanel = new GodocPanel()
    this.consumeViewProvider({
      view: GodocPanelView,
      model: godocpanel,
      allowRegistration: true
    })
  },

  loadGorename () {
    const {Gorename} = require('./rename/gorename')
    this.gorename = new Gorename(this.getGoconfig(), this.getGoget())
    this.subscriptions.add(this.gorename)
  },

  deactivate () {
    this.dispose()
  },

  dispose () {
    this.loaded = false
    this.willUninstall = false
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.formatter = null
    this.getManager = null
    this.statusBar = null
    this.goconfig = null
    this.locator = null
    this.panelManager = null
    this.tester = null
    this.builder = null
    this.autocompleteProvider = null
    this.godoc = null
    this.gorename = null
  },

  disableOldPackages () {
    for (let pkg of oldPackages) {
      let p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      atom.packages.disablePackage(pkg)
    }
  },

  uninstallOldPackages () {
    // remove old packages that have been merged into go-plus
    for (let pkg of oldPackages) {
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
    const {PanelManager} = require('./panel-manager')
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
    this.goconfig = this.provideGoConfig()
    return this.goconfig
  },

  getGoget () {
    if (this.goget) {
      return this.goget
    }

    this.goget = this.provideGoGet()
    return this.goget
  },

  getEnvironment () {
    return Object.assign({}, process.env)
  },

  getExecutor (options) {
    if (this.executor) {
      return this.executor
    }
    const {Executor} = require('./config/executor')
    this.executor = new Executor({environmentFn: this.getEnvironment.bind(this)})
    this.subscriptions.add(this.executor)
    return this.executor
  },

  getLocator () {
    if (this.locator) {
      return this.locator
    }
    const Locator = require('./config/locator').Locator
    this.locator = new Locator({
      environment: this.getEnvironment.bind(this),
      executor: this.getExecutor()
    })
    this.subscriptions.add(this.locator)
    return this.locator
  },

  getGetManager () {
    if (this.getManager) {
      return this.getManager
    }
    if (!this.subscriptions) {
      return
    }
    const {GetManager} = require('./get/get-manager')
    this.getManager = new GetManager(this.getGoconfig())
    this.subscriptions.add(this.getManager)
    return this.getManager
  },

  consumeStatusBar (service) {
    this.statusBar = service
    this.getPanelManager().showStatusBar()
  },

  consumeViewProvider (provider) {
    if (!provider || !provider.view || !provider.model || !provider.model.key) {
      return new Disposable()
    }
    let view = provider.view
    let model = provider.model
    if (model.key && (model.key === 'go' || model.key === 'test' || model.key === 'reference')) {
      if (!provider.allowRegistration) {
        return
      }
    }
    return this.getPanelManager().registerViewProvider(view, model)
  },

  registerTools () {
    if (!this.goget) {
      return
    }
    this.subscriptions.add(this.goget.register('golang.org/x/tools/cmd/goimports'))
    this.subscriptions.add(this.goget.register('golang.org/x/tools/cmd/cover'))
    this.subscriptions.add(this.goget.register('golang.org/x/tools/cmd/gorename'))
    this.subscriptions.add(this.goget.register('github.com/sqs/goreturns'))
    this.subscriptions.add(this.goget.register('github.com/nsf/gocode'))
    this.subscriptions.add(this.goget.register('github.com/alecthomas/gometalinter'))
    this.subscriptions.add(this.goget.register('github.com/zmb3/gogetdoc'))
    this.subscriptions.add(this.goget.register('github.com/rogpeppe/godef'))
  },

  getBuilder () {
    if (this.builder) {
      return this.builder
    }
    const {Builder} = require('./build/builder')
    this.builder = new Builder(this.getGoconfig())
    this.subscriptions.add(this.builder)
    return this.builder
  },

  provideLinter () {
    return this.getBuilder()
  },

  provideGoConfig () {
    let executor = this.getExecutor()
    let locator = this.getLocator()
    return {
      executor: {
        exec: executor.exec.bind(executor),
        execSync: executor.execSync.bind(executor)
      },
      locator: {
        runtimes: locator.runtimes.bind(locator),
        runtime: locator.runtime.bind(locator),
        gopath: locator.gopath.bind(locator),
        findTool: locator.findTool.bind(locator)
      },
      environment: locator.environment.bind(locator)
    }
  },

  provideGoGet () {
    let m = this.getGetManager()
    if (!m) {
      return
    }
    return {
      get: (options) => {
        return m.get(options)
      },
      register: (pack, callback) => {
        return m.register(pack, callback)
      }
    }
  },

  provideGoGet100 () {
    let provider = this.provideGoGet()
    provider.check = () => {
      return Promise.resolve(true)
    }
    delete provider.register
    return provider
  },

  provideAutocomplete () {
    if (this.autocompleteProvider) {
      return this.autocompleteProvider
    }
    const {GocodeProvider} = require('./autocomplete/gocodeprovider')
    this.autocompleteProvider = new GocodeProvider(this.getGoconfig())
    this.subscriptions.add(this.autocompleteProvider)
    return this.autocompleteProvider
  }
}
