'use babel'

import {CompositeDisposable} from 'atom'

export default {
  bootstrap: null,
  bootstrapped: null,
  builder: null,
  configservice: null,
  formatter: null,
  getservice: null,
  godoc: null,
  gorename: null,
  gomodifytags: null,
  loaded: null,
  panelManager: null,
  statusbar: null,
  subscriptions: null,
  tester: null,

  activate () {
    this.subscriptions = new CompositeDisposable()
    this.minimumVersion = '1.12.7'
    this.validateAtomVersion()
    this.bootstrapped = false
    this.loaded = false
    const {Bootstrap} = require('./bootstrap')
    this.bootstrap = new Bootstrap(() => {
      this.bootstrapped = true
      this.showPanel()
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
    }
    this.subscriptions = null
    this.bootstrap = null
    this.formatter = null
    this.statusbar = null
    this.configservice = null
    this.getservice = null
    this.panelManager = null
    this.tester = null
    this.builder = null
    this.autocompleteProvider = null
    this.godoc = null
    this.gorename = null
    this.gomodifytags = null
    this.godef = null
    this.hyperclickProvider = null
  },

  load () {
    this.getPanelManager()
    this.loadInformation()
    this.loadFormatter()
    this.loadTester()
    this.loadDoc()
    this.loadGorename()
    this.loadGoModifyTags()
    this.getGodef()
    if (!atom.config.get('go-plus.testing')) {
      this.loadPackageManager()
    }
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

  loadGuru () {
    if (this.guru) {
      return this.guru
    }

    // Model
    const {Guru} = require('./guru/guru')
    this.guru = new Guru(this.provideGoConfig())

    // View
    const GuruView = require('./doc/guru-view')
    const view = this.consumeViewProvider({
      view: GuruView,
      model: this.guru
    })

    if (this.subscriptions) {
      this.subscriptions.add(this.guru)
      this.subscriptions.add(view)
    }

    return this.guru
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
    // Model
    const {TestPanelManager} = require('./test/test-panel-manager')
    const testPanelManager = new TestPanelManager()

    const {Tester} = require('./test/tester')
    this.tester = new Tester(this.provideGoConfig(), testPanelManager)
    if (this.subscriptions) {
      this.subscriptions.add(this.tester)
    }

    // View
    const TestPanel = require('./test/test-panel')
    const view = this.consumeViewProvider({
      view: TestPanel,
      model: testPanelManager
    })

    if (this.subscriptions) {
      this.subscriptions.add(testPanelManager)
      this.subscriptions.add(this.tester)
      this.subscriptions.add(view)
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
    const GoModifyTags = require('./tags/gomodifytags')
    this.gomodifytags = new GoModifyTags(this.provideGoConfig())
    if (this.subscriptions) {
      this.subscriptions.add(this.gomodifytags)
    }
    return this.gomodifytags
  },

  getBuilder () {
    if (this.builder) {
      return this.builder
    }
    const {Builder} = require('./build/builder')
    this.builder = new Builder(this.provideGoConfig())

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
    this.linter = new GometalinterLinter(this.provideGoConfig())

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
    this.panelManager = new PanelManager(() => {
      if (this.statusbar) {
        return this.statusbar
      }
      return false
    })

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
      this.getPanelManager().setActivated()
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
  consumeStatusBar (service) {
    this.statusbar = service
    this.showPanel()
  },

  consumeViewProvider (provider) {
    if (!provider) {
      return
    }

    return this.getPanelManager().registerViewProvider(provider.view, provider.model)
  },

  provideLinter () {
    return [this.getBuilder(), this.getGometalinterLinter()]
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
    this.getservice = new GetService(this.provideGoConfig())
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
