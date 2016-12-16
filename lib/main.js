'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import os from 'os'

const oldPackages = [
  'gofmt',
  'tester-go',
  'builder-go',
  'autocomplete-go',
  'godoc',
  'gorename',
  'go-hyperclick',
  'navigator-go',
  'go-get',
  'go-config',
  'gometalinter-linter'
]

const goTools = new Map([
  ['goimports', 'golang.org/x/tools/cmd/goimports'],
  ['cover', 'golang.org/x/tools/cmd/cover'],
  ['gorename', 'golang.org/x/tools/cmd/gorename'],
  ['goreturns', 'github.com/sqs/goreturns'],
  ['gocode', 'github.com/nsf/gocode'],
  ['gometalinter', 'github.com/alecthomas/gometalinter'],
  ['gogetdoc', 'github.com/zmb3/gogetdoc'],
  ['godef', 'github.com/rogpeppe/godef'],
  ['guru', 'golang.org/x/tools/cmd/guru']
])

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
    if (atom.config.get('go-plus.testing')) {
      this.load()
    } else {
      setTimeout(() => {
        this.load()
      }, 1)
    }
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
    this.getGodef()
    if (atom.config.get('go-plus.disableToolCheck')) {
      this.loaded = true
      return
    }
    this.registerTools()
    const {ToolChecker} = require('./tool-checker')
    if (!this.toolChecker) {
      this.toolChecker = new ToolChecker(this.goconfig)
      this.subscriptions.add(this.toolChecker)
    }
    this.toolChecker.checkForTools(Array.from(goTools.keys()))
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
    this.consumeViewProvider({
      view: GodocPanelView,
      model: this.godoc.getPanel(),
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
    this.godef = null
    this.hyperclickProvider = null
  },

  disableOldPackages () {
    for (const pkg of oldPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      atom.packages.disablePackage(pkg)
    }
  },

  uninstallOldPackages () {
    // remove old packages that have been merged into go-plus
    for (const pkg of oldPackages) {
      const p = atom.packages.getLoadedPackage(pkg)
      if (!p) {
        continue
      }
      console.log(`removing package ${pkg}`)
      atom.packages.activatePackage('settings-view').then((pack) => {
        if (pack && pack.mainModule) {
          const settingsview = pack.mainModule.createSettingsView({uri: pack.mainModule.configUri})
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

    if (this.subscriptions) {
      this.subscriptions.add(this.panelManager)
    }

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

  getExecutor (options) {
    if (this.executor) {
      return this.executor
    }
    const {Executor} = require('./config/executor')
    this.executor = new Executor()

    if (this.subscriptions) {
      this.subscriptions.add(this.executor)
    }

    return this.executor
  },

  getLocator () {
    if (this.locator) {
      return this.locator
    }
    const {Locator} = require('./config/locator')
    this.locator = new Locator({
      executor: this.getExecutor()
    })

    if (this.subscriptions) {
      this.subscriptions.add(this.locator)
    }

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

    if (this.subscriptions) {
      this.subscriptions.add(this.getManager)
    }

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
    const view = provider.view
    const model = provider.model
    if (model.key && (model.key === 'go' || model.key === 'test' || model.key === 'reference')) {
      if (!provider.allowRegistration) {
        return
      }
    }
    return this.getPanelManager().registerViewProvider(view, model)
  },

  registerTools () {
    if (!this.goget || !this.subscriptions) {
      return
    }
    for (const [key, value] of goTools) {
      if (key === 'gometalinter') {
        this.subscriptions.add(this.goget.register(value, () => {
          this.goconfig.locator.findTool('gometalinter').then((cmd) => {
            if (!cmd) {
              return
            }
            const notification = atom.notifications.addInfo('gometalinter', {
              dismissable: true,
              icon: 'cloud-download',
              description: 'Running `gometalinter --install` to install tools.'
            })
            return this.getGoconfig().executor.exec(cmd, ['--install'], 'project').then((r) => {
              notification.dismiss()
              const detail = r.stdout + os.EOL + r.stderr

              if (r.exitcode !== 0) {
                atom.notifications.addWarning('gometalinter', {
                  dismissable: true,
                  icon: 'cloud-download',
                  detail: detail.trim()
                })
                return r
              }
              if (r.stderr && r.stderr.trim() !== '') {
                console.log('go-plus: (stderr) ' + r.stderr)
              }
              atom.notifications.addSuccess('gometalinter', {
                dismissable: true,
                icon: 'cloud-download',
                detail: detail.trim(),
                description: 'The tools were installed.'
              })
              return r
            })
          })
        }))
      } else {
        this.subscriptions.add(this.goget.register(value))
      }
    }
  },

  getBuilder () {
    if (this.builder) {
      return this.builder
    }
    const {Builder} = require('./build/builder')
    this.builder = new Builder(this.getGoconfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.builder)
    }

    return this.builder
  },

  getGometalinterLinter () {
    if (this.linter) {
      return this.linter
    }
    const {GometalinterLinter} = require('./lint/linter')
    this.linter = new GometalinterLinter(this.getGoconfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.linter)
    }

    return this.linter
  },

  getGodef () {
    if (this.godef) {
      return this.godef
    }
    const {Godef} = require('./navigator/godef')
    this.godef = new Godef(this.getGoconfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.godef)
    }

    return this.godef
  },

  provideLinter () {
    return [this.getBuilder(), this.getGometalinterLinter()]
  },

  provideGoConfig () {
    const executor = this.getExecutor()
    const locator = this.getLocator()
    return {
      executor: {
        exec: executor.exec.bind(executor),
        execSync: executor.execSync.bind(executor),
        getOptions: executor.getOptions.bind(executor)
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
    const m = this.getGetManager()
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
    const provider = this.provideGoGet()
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

    if (this.subscriptions) {
      this.subscriptions.add(this.autocompleteProvider)
    }

    return this.autocompleteProvider
  },

  provideHyperclick () {
    if (this.hyperclickProvider) {
      return this.hyperclickProvider
    }
    const {GoHyperclick} = require('./navigator/go-hyperclick')
    this.hyperclickProvider = new GoHyperclick(() => {
      return this.godef
    })

    if (this.subscriptions) {
      this.subscriptions.add(this.hyperclickProvider)
    }

    return this.hyperclickProvider
  }
}
