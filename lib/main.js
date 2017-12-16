// @flow

import {CompositeDisposable} from 'atom'

export default {
  bootstrap: null,
  bootstrapped: null,
  builder: null,
  configservice: null,
  formatter: null,
  getservice: null,
  godef: null,
  godoc: null,
  gomodifytags: null,
  gorename: null,
  information: null,
  implements: null,
  importer: null,
  linter: null,
  loaded: null,
  orchestrator: null,
  outputManager: null,
  panelManager: null,
  statusbar: null,
  subscriptions: null,
  tester: null,
  usage: null,
  what: null,

  activate () {
    this.subscriptions = new CompositeDisposable()
    this.minimumVersion = '1.12.7'
    this.validateAtomVersion()
    this.bootstrapped = false
    this.loaded = false

    const {Orchestrator} = require('./orchestrator')
    this.orchestrator = new Orchestrator()
    this.subscriptions.add(this.orchestrator)

    const {Bootstrap} = require('./bootstrap')
    this.bootstrap = new Bootstrap(() => {
      this.bootstrapped = true
      this.load()
      this.loaded = true
    })
    this.subscriptions.add(this.bootstrap)
  },

  deactivate () {
    this.dispose()
  },

  dispose () {
    this.bootstrapped = false
    this.loaded = false
    if (this.subscriptions) {
      this.subscriptions.dispose()
      this.subscriptions = null
    }
    this.bootstrap = null
    this.builder = null
    this.configservice = null
    this.formatter = null
    this.getservice = null
    this.godef = null
    this.godoc = null
    this.gomodifytags = null
    this.gorename = null
    this.information = null
    this.implements = null
    this.importer = null
    this.linter = null
    this.orchestrator = null
    this.outputManager = null
    this.panelManager = null
    this.statusbar = null
    this.tester = null
    this.usage = null
    this.what = null

    this.autocompleteProvider = null
    this.hyperclickProvider = null
  },

  load () {
    this.getPanelManager()
    this.loadOutput()
    this.loadInformation()
    this.loadFormatter()
    this.loadBuilder()
    this.loadTester()
    this.loadGometalinter()
    this.loadDoc()
    this.loadUsage()
    this.loadWhat()
    this.loadImplements()
    this.loadGorename()
    this.loadGoModifyTags()
    this.loadImporter()
    this.getGodef()
    if (!atom.config.get('go-plus.testing')) {
      this.loadPackageManager()
    }
    this.getPanelManager().requestUpdate()

    this.subscriptions.add(this.orchestrator.register('format', (e) => { return this.formatter.handleWillSaveEvent(e) }, 'willSave'))
    this.subscriptions.add(this.orchestrator.register('builder', (editor, path) => { return this.builder.build(editor, path) }))
    this.subscriptions.add(this.orchestrator.register('tester', (editor, path) => { return this.tester.handleSaveEvent(editor, path) }))
    this.subscriptions.add(this.orchestrator.register('linter', (editor, path) => { return this.linter.lint(editor, path) }))

    this.loaded = true
  },

  loadInformation () {
    if (this.information) {
      return this.information
    }

    const InformationView = require('./info/information-view')
    const {Information} = require('./info/information')
    this.information = new Information(this.provideGoConfig())
    const view = this.consumeViewProvider({
      view: InformationView,
      model: this.information
    })
    if (this.subscriptions) {
      this.subscriptions.add(this.information)
      this.subscriptions.add(view)
    }

    return this.information
  },

  loadImporter () {
    if (this.importer) {
      return this.importer
    }
    const {Importer} = require('./import/importer')
    this.importer = new Importer(this.provideGoConfig())
    return this.importer
  },

  loadDoc () {
    if (this.godoc) {
      return this.godoc
    }

    // Model
    const {Godoc} = require('./doc/godoc')
    this.godoc = new Godoc(this.provideGoConfig())

    // View
    const GodocView = require('./doc/godoc-view')
    const view = this.consumeViewProvider({
      view: GodocView,
      model: this.godoc.getPanel()
    })

    if (this.subscriptions) {
      this.subscriptions.add(this.godoc)
      this.subscriptions.add(view)
    }
    return this.godoc
  },

  loadImplements () {
    if (this.implements) {
      return this.implements
    }
    const {Implements} = require('./implements/implements')
    this.implements = new Implements(this.provideGoConfig())
    const {ImplementsView} = require('./implements/implements-view')
    const view = this.consumeViewProvider({
      view: ImplementsView,
      model: this.implements
    })
    if (this.subscriptions) {
      this.subscriptions.add(this.implements)
      this.subscriptions.add(view)
    }
    return this.implements
  },

  loadUsage () {
    if (this.usage) {
      return this.usage
    }

    // Model
    const {Usage} = require('./usage/usage')
    this.usage = new Usage(this.provideGoConfig())

    // View
    const UsageView = require('./usage/usage-view')
    const view = this.consumeViewProvider({
      view: UsageView,
      model: this.usage
    })

    if (this.subscriptions) {
      this.subscriptions.add(this.usage)
      this.subscriptions.add(view)
    }

    return this.usage
  },

  loadWhat () {
    if (this.what) {
      return this.what
    }

    // Model
    const {What} = require('./what/what')
    this.what = new What(this.provideGoConfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.what)
    }

    return this.what
  },

  loadOutput () {
    if (this.outputManager) {
      return this.outputManager
    }
    const {OutputManager} = require('./output-manager')
    this.outputManager = new OutputManager()

    const OutputPanel = require('./output-panel')
    const view = this.consumeViewProvider({
      view: OutputPanel,
      model: this.outputManager
    })

    if (this.subscriptions) {
      this.subscriptions.add(view)
    }

    return this.outputManager
  },

  loadFormatter () {
    if (this.formatter) {
      return
    }
    const {Formatter} = require('./format/formatter')
    this.formatter = new Formatter(this.provideGoConfig())
    if (this.subscriptions) {
      this.subscriptions.add(this.formatter)
    }
    return this.formatter
  },

  loadTester () {
    if (this.tester) {
      return this.tester
    }

    const {Tester} = require('./test/tester')
    this.tester = new Tester(this.provideGoConfig(), this.loadOutput())
    if (this.subscriptions) {
      this.subscriptions.add(this.tester)
    }

    if (this.subscriptions) {
      this.subscriptions.add(this.tester)
    }

    return this.tester
  },

  loadGorename () {
    if (this.gorename) {
      return this.gorename
    }
    const {Gorename} = require('./rename/gorename')
    this.gorename = new Gorename(this.provideGoConfig())
    if (this.subscriptions) {
      this.subscriptions.add(this.gorename)
    }

    return this.gorename
  },

  loadGoModifyTags () {
    if (this.gomodifytags) {
      return this.gomodifytags
    }
    const {GoModifyTags} = require('./tags/gomodifytags')
    this.gomodifytags = new GoModifyTags(this.provideGoConfig())
    if (this.subscriptions) {
      this.subscriptions.add(this.gomodifytags)
    }
    return this.gomodifytags
  },

  loadBuilder () {
    if (this.builder) {
      return this.builder
    }
    const {Builder} = require('./build/builder')
    this.builder = new Builder(this.provideGoConfig(), () => this.buildLinter, this.loadOutput())

    if (this.subscriptions) {
      this.subscriptions.add(this.builder)
    }

    return this.builder
  },

  loadGometalinter () {
    if (this.linter) {
      return this.linter
    }
    const {GometalinterLinter} = require('./lint/linter')
    this.linter = new GometalinterLinter(this.provideGoConfig(), () => this.gometalinterLinter)

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
    this.godef = new Godef(this.provideGoConfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.godef)
    }

    return this.godef
  },

  // Panel
  getPanelManager () {
    if (this.panelManager) {
      return this.panelManager
    }
    const {PanelManager} = require('./panel/panel-manager')
    this.panelManager = new PanelManager(() => this.statusbar || false)

    if (this.subscriptions) {
      this.subscriptions.add(this.panelManager)
    }

    return this.panelManager
  },

  showPanel () {
    if (this.bootstrapped) {
      if (this.statusbar) {
        this.getPanelManager().showStatusBar()
      }
      this.getPanelManager().togglePanel(true)
    }
  },

  // Package Manager
  loadPackageManager () {
    if (this.packagemanager) {
      return this.packagemanager
    }

    const {PackageManager} = require('./package-manager')
    this.packagemanager = new PackageManager(this.provideGoConfig(), this.provideGoGet())

    if (this.subscriptions) {
      this.subscriptions.add(this.packagemanager)
    }

    return this.packagemanager
  },

  // Services
  consumeStatusBar (service: any) {
    this.statusbar = service
  },

  consumeViewProvider (provider: any) {
    if (!provider) {
      return
    }

    return this.getPanelManager().registerViewProvider(provider.view, provider.model)
  },

  consumeLinter (registry: any) {
    this.buildLinter = registry({name: 'go build'})
    this.subscriptions.add(this.buildLinter)
    this.gometalinterLinter = registry({name: 'gometalinter'})
    this.subscriptions.add(this.gometalinterLinter)
  },

  provideGoConfig () {
    if (this.configservice) {
      return this.configservice.provide()
    }
    const {ConfigService} = require('./config/service')
    this.configservice = new ConfigService()
    return this.configservice.provide()
  },

  provideGoGet () {
    if (this.getservice) {
      return this.getservice.provide()
    }
    const {GetService} = require('./get/service')
    this.getservice = new GetService(this.provideGoConfig(), () => this.loadOutput())
    return this.getservice.provide()
  },

  provideAutocomplete () {
    if (this.autocompleteProvider) {
      return this.autocompleteProvider
    }
    const {GocodeProvider} = require('./autocomplete/gocodeprovider')
    this.autocompleteProvider = new GocodeProvider(this.provideGoConfig())

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
      return this.getGodef()
    })

    if (this.subscriptions) {
      this.subscriptions.add(this.hyperclickProvider)
    }

    return this.hyperclickProvider
  },

  validateAtomVersion () {
    const semver = require('semver')
    if (semver.lt(atom.appVersion, this.minimumVersion)) {
      const os = require('os')
      const notification = atom.notifications.addError('go-plus', {
        dismissable: true,
        icon: 'flame',
        detail: 'you are running an old version of Atom',
        description: '`go-plus` requires at least `v' + this.minimumVersion + '` but you are running v`' + atom.appVersion + '`.' + os.EOL + os.EOL + 'Please update Atom to the latest version.'
      })
      if (this.subscriptions) {
        this.subscriptions.add({dispose: () => {
          notification.dismiss()
        }})
      }
    }
  }
}
