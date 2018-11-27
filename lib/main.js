// @flow

import { CompositeDisposable } from 'atom'

export default {
  bootstrap: null,
  bootstrapped: null,
  builder: null,
  busySignal: null,
  configservice: null,
  formatter: null,
  getservice: null,
  navigator: null,
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
  references: null,
  highlight: null,
  outlineProvider: null,

  activate() {
    this.subscriptions = new CompositeDisposable()
    this.minimumVersion = '1.12.7'
    this.validateAtomVersion()
    this.bootstrapped = false
    this.loaded = false

    const { Orchestrator } = require('./orchestrator')
    this.orchestrator = new Orchestrator()
    this.subscriptions.add(this.orchestrator)

    const { Bootstrap } = require('./bootstrap')
    this.bootstrap = new Bootstrap(() => {
      this.bootstrapped = true
      this.load()
      this.loaded = true
      this.checkFormatOnSave()
    })
    this.subscriptions.add(this.bootstrap)
  },

  deactivate() {
    this.dispose()
  },

  dispose() {
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
    this.navigator = null
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
    this.references = null
    this.highlight = null

    this.autocompleteProvider = null
    this.definitionProvider = null
  },

  load() {
    this.getPanelManager()
    this.loadOutput()
    this.loadInformation()
    this.loadBuilder()
    this.loadTester()
    this.loadGometalinter()
    this.loadDoc()
    this.loadImplements()
    this.loadGorename()
    this.loadGoModifyTags()
    this.loadImporter()
    this.loadNavigator()
    if (!atom.config.get('go-plus.testing')) {
      this.loadPackageManager()
    }
    this.getPanelManager().requestUpdate()

    this.subscriptions.add(
      this.orchestrator.register('builder', (editor, path) => {
        if (this.builder) this.builder.build(editor, path)
        return
      })
    )
    this.subscriptions.add(
      this.orchestrator.register('tester', (editor, path) => {
        if (this.tester) this.tester.handleSaveEvent(editor, path)
        return
      })
    )
    this.subscriptions.add(
      this.orchestrator.register('linter', (editor, path) => {
        if (this.linter) this.linter.lint(editor, path)
        return
      })
    )

    this.loaded = true
  },

  loadInformation() {
    if (this.information) {
      return this.information
    }

    const InformationView = require('./info/information-view')
    const { Information } = require('./info/information')
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

  loadImporter() {
    if (this.importer) {
      return this.importer
    }
    const { Importer } = require('./import/importer')
    this.importer = new Importer(this.provideGoConfig())
    return this.importer
  },

  loadDoc() {
    if (this.godoc) {
      return this.godoc
    }

    const { Godoc } = require('./doc/godoc')
    this.godoc = new Godoc(this.provideGoConfig())

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

  loadImplements() {
    if (this.implements) {
      return this.implements
    }
    const { Implements } = require('./implements/implements')
    this.implements = new Implements(this.provideGoConfig())
    const { ImplementsView } = require('./implements/implements-view')
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

  provideOutlines() {
    if (this.outlineProvider) {
      return this.outlineProvider
    }
    const { OutlineProvider } = require('./outline/outline-provider')
    this.outlineProvider = new OutlineProvider(this.provideGoConfig())
    return this.outlineProvider
  },

  provideCodeHighlight() {
    if (this.highlight) {
      return this.highlight
    }

    const { HighlightProvider } = require('./highlight/highlight-provider')
    this.highlight = new HighlightProvider(this.provideGoConfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.highlight)
    }

    return this.highlight
  },

  loadOutput() {
    if (this.outputManager) {
      return this.outputManager
    }
    const { OutputManager } = require('./output-manager')
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

  provideCodeFormatter() {
    if (this.formatter) {
      return this.formatter
    }
    const { Formatter } = require('./format/formatter')
    this.formatter = new Formatter(this.provideGoConfig())
    if (this.subscriptions) {
      this.subscriptions.add(this.formatter)
    }
    return this.formatter
  },

  loadTester() {
    if (this.tester) {
      return this.tester
    }

    const { Tester } = require('./test/tester')
    this.tester = new Tester(
      this.provideGoConfig(),
      this.loadOutput(),
      () => this.busySignal
    )
    if (this.subscriptions) {
      this.subscriptions.add(this.tester)
    }

    if (this.subscriptions) {
      this.subscriptions.add(this.tester)
    }

    return this.tester
  },

  loadGorename() {
    if (this.gorename) {
      return this.gorename
    }
    const { Gorename } = require('./rename/gorename')
    this.gorename = new Gorename(this.provideGoConfig())
    if (this.subscriptions) {
      this.subscriptions.add(this.gorename)
    }

    return this.gorename
  },

  loadGoModifyTags() {
    if (this.gomodifytags) {
      return this.gomodifytags
    }
    const { GoModifyTags } = require('./tags/gomodifytags')
    this.gomodifytags = new GoModifyTags(this.provideGoConfig())
    if (this.subscriptions) {
      this.subscriptions.add(this.gomodifytags)
    }
    return this.gomodifytags
  },

  loadBuilder() {
    if (this.builder) {
      return this.builder
    }
    const { Builder } = require('./build/builder')
    this.builder = new Builder(
      this.provideGoConfig(),
      () => this.buildLinter,
      this.loadOutput(),
      () => this.busySignal
    )

    if (this.subscriptions) {
      this.subscriptions.add(this.builder)
    }

    return this.builder
  },

  loadGometalinter() {
    if (this.linter) {
      return this.linter
    }
    const { GometalinterLinter } = require('./lint/linter')
    this.linter = new GometalinterLinter(
      this.provideGoConfig(),
      () => this.gometalinterLinter,
      () => this.busySignal
    )

    if (this.subscriptions) {
      this.subscriptions.add(this.linter)
    }

    return this.linter
  },

  loadNavigator() {
    if (this.navigator) {
      return this.navigator
    }
    const { Navigator } = require('./navigator/navigator')
    this.navigator = new Navigator(this.provideGoConfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.navigator)
    }

    return this.navigator
  },

  getPanelManager() {
    if (this.panelManager) {
      return this.panelManager
    }
    const { PanelManager } = require('./panel/panel-manager')
    this.panelManager = new PanelManager(() => this.statusbar || false)

    if (this.subscriptions) {
      this.subscriptions.add(this.panelManager)
    }

    return this.panelManager
  },

  showPanel() {
    if (this.bootstrapped) {
      if (this.statusbar) {
        this.getPanelManager().showStatusBar()
      }
      this.getPanelManager().togglePanel(true)
    }
  },

  loadPackageManager() {
    if (this.packagemanager) {
      return this.packagemanager
    }

    const { PackageManager } = require('./package-manager')
    this.packagemanager = new PackageManager(
      this.provideGoConfig(),
      this.provideGoGet()
    )

    if (this.subscriptions) {
      this.subscriptions.add(this.packagemanager)
    }

    return this.packagemanager
  },

  consumeStatusBar(service: any) {
    this.statusbar = service
  },

  consumeBusySignal(service: any) {
    this.busySignal = service
  },

  consumeViewProvider(provider: any) {
    if (!provider) {
      return
    }

    return this.getPanelManager().registerViewProvider(
      provider.view,
      provider.model
    )
  },

  consumeLinter(registry: any) {
    this.buildLinter = registry({ name: 'go build' })
    this.subscriptions.add(this.buildLinter)
    this.gometalinterLinter = registry({ name: 'gometalinter' })
    this.subscriptions.add(this.gometalinterLinter)
  },

  consumeDatatipService(service: any) {
    service.addProvider(this.loadDoc())
  },

  provideGoConfig() {
    if (this.configservice) {
      return this.configservice.provide()
    }
    const { ConfigService } = require('./config/service')
    this.configservice = new ConfigService()
    this.subscriptions.add(this.configservice)
    return this.configservice.provide()
  },

  provideGoGet() {
    if (this.getservice) {
      return this.getservice.provide()
    }
    const { GetService } = require('./get/service')
    this.getservice = new GetService(
      this.provideGoConfig(),
      () => this.loadOutput(),
      () => this.busySignal
    )
    return this.getservice.provide()
  },

  provideAutocomplete() {
    if (this.autocompleteProvider) {
      return this.autocompleteProvider
    }
    const { GocodeProvider } = require('./autocomplete/gocodeprovider')
    this.autocompleteProvider = new GocodeProvider(this.provideGoConfig())

    if (this.subscriptions) {
      this.subscriptions.add(this.autocompleteProvider)
    }

    return this.autocompleteProvider
  },

  provideReferences() {
    if (this.references) {
      return this.references
    }

    const { ReferencesProvider } = require('./references/references-provider')
    this.references = new ReferencesProvider(this.provideGoConfig())
    return this.references
  },

  provideDefinitions() {
    if (this.definitionProvider) {
      return this.definitionProvider
    }
    const { DefinitionProvider } = require('./navigator/definition-provider')
    this.definitionProvider = new DefinitionProvider(() => this.loadNavigator())

    if (this.subscriptions) {
      this.subscriptions.add(this.definitionProvider)
    }

    return this.definitionProvider
  },

  checkFormatOnSave() {
    const skip = atom.config.get('go-plus.skipCodeFormatCheck')
    if (skip) return

    const formatOnSave = atom.config.get(
      'atom-ide-ui.atom-ide-code-format.formatOnSave'
    )
    if (formatOnSave) return

    const n = atom.notifications.addInfo('go-plus', {
      buttons: [
        {
          text: 'Yes',
          onDidClick: () => {
            atom.config.set(
              'atom-ide-ui.atom-ide-code-format.formatOnSave',
              true
            )
            n.dismiss()
          }
        },
        { text: 'No', onDidClick: () => n.dismiss() },
        {
          text: `Never (don't ask me again)`,
          onDidClick: () => {
            atom.config.set('go-plus.skipCodeFormatCheck', true)
            n.dismiss()
          }
        }
      ],
      dismissable: true,
      description:
        "In order for go-plus to format code on save, `atom-ide-ui`'s " +
        'format on save option must be enabled.  Would you like to enable it now?'
    })
  },

  validateAtomVersion() {
    const semver = require('semver')
    if (semver.lt(atom.appVersion, this.minimumVersion)) {
      const os = require('os')
      const notification = atom.notifications.addError('go-plus', {
        dismissable: true,
        icon: 'flame',
        detail: 'you are running an old version of Atom',
        description:
          '`go-plus` requires at least `v' +
          this.minimumVersion +
          '` but you are running v`' +
          atom.appVersion +
          '`.' +
          os.EOL +
          os.EOL +
          'Please update Atom to the latest version.'
      })
      if (this.subscriptions) {
        this.subscriptions.add({
          dispose: () => {
            notification.dismiss()
          }
        })
      }
    }
  }
}
