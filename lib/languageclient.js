// @flow

import { spawn } from 'child_process'
import os from 'os'
import { Disposable } from 'atom'
import { AutoLanguageClient } from 'atom-languageclient'
import type { PanelModel } from './panel/tab'
import type { Renderable } from './etch-component'

// TODO: package manager

class GoLanguageClient extends AutoLanguageClient {
  orchestrator = null
  bootstrap = null
  configservice = null
  getservice = null
  loaded: boolean = false
  builder = null
  linterDelegate: any = null
  buildLinterDelegate: any = null
  panelManager = null
  outputManager = null
  information = null
  golinter = null
  godoc = null
  tester = null
  gomodifytags = null
  implements = null
  importer = null
  references = null

  getGrammarScopes(): Array<string> {
    return ['source.go', 'go']
  }

  getLanguageName(): string {
    return 'Go'
  }

  getServerName(): string {
    return 'gopls'
  }

  getConnectionType(): string {
    return 'stdio'
  }

  async startServerProcess() {
    const cmd = await this.provideGoConfig().locator.findTool('gopls')
    if (cmd) {
      return spawn(cmd, ['serve'])
    }

    const notification = atom.notifications.addError('go-plus', {
      dismissable: true,
      detail: 'Missing `gopls`',
      description:
        'The `gopls` language server could not be found' +
        os.EOL +
        os.EOL +
        'Would you like to install it?',
      buttons: [
        {
          text: 'Yes',
          onDidClick: async () => {
            notification.dismiss()
            this.provideGoGet()
            const gs: any = this.getservice
            gs.getmanager.performGet('golang.org/x/tools/cmd/gopls')
            this.promptForReload()
          }
        },
        {
          text: 'No',
          ondidClick: () => notification.dismiss()
        }
      ]
    })
  }

  promptForReload() {
    const notification = atom.notifications.addInfo('go-plus', {
      dismissable: false,
      detail: 'Please reload',
      description:
        '`gopls` has been installed.  Please reload Atom to start the language server.' +
        os.EOL +
        os.EOL +
        'Would you like to reload now?',
      buttons: [
        {
          text: 'Yes',
          onDidClick: () =>
            atom.commands.dispatch(
              atom.views.getView(atom.workspace),
              'window:reload'
            )
        },
        { text: 'No', onDidClick: () => notification.dismiss() }
      ]
    })
  }

  consumeLinterV2(register) {
    // handles diagnostics from language server
    super.consumeLinterV2(register)

    // provide diagnostics from additional linters
    this.buildLinterDelegate = register({ name: 'go build' })
    this.linterDelegate = register({ name: 'go linter' })
    if (this._disposable) {
      this._disposable.add(this.buildLinterDelegate, this.linterDelegate)
    }
  }

  consumeConsole(createConsole) {
    const disp = super.consumeConsole(createConsole)
    this.console = createConsole({ id: 'go-plus', name: 'go-plus' })
    return new Disposable(() => {
      this.console.dispose()
      this.console = null
      disp.dispose()
    })
  }

  consumeDatatip(service) {
    // dont leverage gopls for datatips yet (it doesn't show documentation)
    // super.consumeDatatip(service)
    service.addProvider(this.loadDoc())
  }

  provideFindReferences() {
    // TODO: remove me when gopls supports references
    //return super.provideFindReferences()

    if (this.references) {
      return this.references
    }

    const { ReferencesProvider } = require('./references/references-provider')
    this.references = new ReferencesProvider(this.provideGoConfig())
    return this.references
  }

  activate() {
    super.activate()

    const { Orchestrator } = require('./orchestrator')
    this.orchestrator = new Orchestrator()
    this._disposable.add(this.orchestrator)

    const { Bootstrap } = require('./bootstrap')
    this.bootstrap = new Bootstrap(() => {
      this.bootstrapped = true
      this.load()
      this.loaded = true
      this.checkFormatOnSave()
    })
    this._disposable.add(this.bootstrap)
  }

  deactivate() {
    super.deactivate()
    this.loaded = false
    this.bootstrapped = false

    this.bootstrap = null
    this.builder = null
    this.configservice = null
    this.getservice = null
    this.information = null
    this.golinter = null
    this.orchestrator = null
    this.outputManager = null
    this.panelManager = null
    this.tester = null
    this.godoc = null
    this.gomodifytags = null
    this.implements = null
    this.importer = null
    this.references = null
  }

  load() {
    this.loadBuilder()
    this.loadTester()
    this.loadLinter()
    this.loadOutput()
    this.loadInformation()
    this.loadDoc()
    this.loadGoModifyTags()
    this.loadImplements()
    this.loadImporter()

    if (!atom.config.get('go-plus.testing')) {
      this.loadPackageManager()
    }

    this.getPanelManager().requestUpdate()
    this.loaded = true
  }

  provideGoConfig() {
    if (this.configservice) {
      return this.configservice.provide()
    }
    const { ConfigService } = require('./config/service')
    this.configservice = new ConfigService(() => this.console)
    if (this._disposable) {
      this._disposable.add(this.configservice)
    }
    return this.configservice.provide()
  }

  provideGoGet() {
    if (this.getservice) {
      return this.getservice.provide()
    }
    const { GetService } = require('./get/service')
    this.getservice = new GetService(
      this.provideGoConfig(),
      () => this.loadOutput(),
      () => this.busySignalService
    )
    return this.getservice.provide()
  }

  consumeViewProvider(provider: {
    view: Class<Renderable>,
    model: PanelModel
  }) {
    if (!provider) {
      // for simplified type handling just assume
      // that this never happens for our own code
      return (null: any)
    }

    return this.getPanelManager().registerViewProvider(
      provider.view,
      provider.model
    )
  }

  getPanelManager() {
    if (this.panelManager) {
      return this.panelManager
    }
    const { PanelManager } = require('./panel/panel-manager')
    this.panelManager = new PanelManager()

    if (this._disposable) {
      this._disposable.add(this.panelManager)
    }

    return this.panelManager
  }

  loadBuilder() {
    if (this.builder) return this.builder

    const { Builder } = require('./build/builder')
    this.builder = new Builder(
      this.provideGoConfig(),
      () => this.buildLinterDelegate,
      this.loadOutput(),
      () => this.busySignalService
    )

    // register for save events
    if (!this.orchestrator) return
    this._disposable.add(
      this.orchestrator.register(
        'builder',
        (editor: TextEditor, path: string) => {
          if (this.builder) this.builder.build(editor, path)
        }
      )
    )
  }

  loadDoc() {
    if (this.godoc) {
      return this.godoc
    }

    const { Godoc } = require('./doc/godoc')
    const godoc = new Godoc(this.provideGoConfig())
    this.godoc = godoc

    const { GodocView } = require('./doc/godoc-view')
    const view = this.consumeViewProvider({
      view: GodocView,
      model: godoc.getPanel()
    })

    if (this._disposable) {
      this._disposable.add(godoc, view)
    }
    return godoc
  }

  loadTester() {
    if (this.tester) return this.tester

    const { Tester } = require('./test/tester')
    this.tester = new Tester(
      this.provideGoConfig(),
      this.loadOutput(),
      () => this.busySignalService
    )
    if (this._disposable) this._disposable.add(this.tester)

    // register for save events
    if (this.orchestrator) {
      this._disposable.add(
        this.orchestrator.register(
          'tester',
          (editor: TextEditor, path: string) => {
            void path
            if (this.tester) this.tester.handleSaveEvent(editor)
          }
        )
      )
    }

    return this.tester
  }

  loadLinter() {
    if (this.golinter) return this.golinter

    const { Linter } = require('./lint/linter')
    this.golinter = new Linter(
      this.provideGoConfig(),
      () => this.linterDelegate,
      () => this.busySignalService
    )

    // register for save events
    if (this.orchestrator) {
      this._disposable.add(
        this.orchestrator.register(
          'linter',
          (editor: TextEditor, path: string) => {
            void path
            if (this.golinter) this.golinter.lint(editor)
          }
        )
      )
    }

    return this.golinter
  }

  loadInformation() {
    if (this.information) {
      return this.information
    }

    const { InformationView } = require('./info/information-view')
    const { Information } = require('./info/information')
    const information = new Information(this.provideGoConfig())
    this.information = information
    const view = this.consumeViewProvider({
      view: InformationView,
      model: information
    })
    if (this._disposable) {
      this._disposable.add(information, view)
    }

    return this.information
  }

  loadOutput() {
    if (this.outputManager) {
      return this.outputManager
    }
    const { OutputManager } = require('./output-manager')
    const outputManager = new OutputManager()
    this.outputManager = outputManager

    const { OutputPanel } = require('./output-panel')
    const view = this.consumeViewProvider({
      view: OutputPanel,
      model: this.outputManager
    })

    if (this._disposable) {
      this._disposable.add(view)
    }

    return outputManager
  }

  loadGoModifyTags() {
    if (this.gomodifytags) {
      return this.gomodifytags
    }
    const { GoModifyTags } = require('./tags/gomodifytags')
    this.gomodifytags = new GoModifyTags(this.provideGoConfig())
    if (this._disposable) {
      this._disposable.add(this.gomodifytags)
    }
    return this.gomodifytags
  }

  loadImplements() {
    if (this.implements) {
      return this.implements
    }
    const { Implements } = require('./implements/implements')
    const impls = new Implements(this.provideGoConfig())
    this.implements = impls
    const { ImplementsView } = require('./implements/implements-view')
    const view = this.consumeViewProvider({
      view: ImplementsView,
      model: impls
    })
    if (this._disposable) {
      this._disposable.add(impls, view)
    }
    return impls
  }

  loadImporter() {
    if (this.importer) {
      return this.importer
    }
    const { Importer } = require('./import/importer')
    this.importer = new Importer(this.provideGoConfig())
    return this.importer
  }

  loadPackageManager() {
    if (this.packagemanager) {
      return this.packagemanager
    }

    const { PackageManager } = require('./package-manager')
    this.packagemanager = new PackageManager(
      this.provideGoConfig(),
      this.provideGoGet()
    )

    if (this._disposable) {
      this._disposable.add(this.packagemanager)
    }

    return this.packagemanager
  }

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
  }
}

module.exports = new GoLanguageClient()
