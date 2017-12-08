// @flow

import {CompositeDisposable} from 'atom'
import ImporterView from './importer-view'
import {getEditor} from './../utils'
import {allPackages} from './../go'

import type {GoConfig} from './../config/service'

export default class Importer {
  goconfig: GoConfig
  subscriptions: CompositeDisposable
  view: ImporterView

  constructor (goconfig: GoConfig) {
    this.goconfig = goconfig
    this.view = new ImporterView({
      items: [],
      didConfirmSelection: pkg => this.addImport(pkg)
    })
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(
      'atom-text-editor', 'golang:import-package',
      () => this.commandInvoked()))
    this.subscriptions.add(this.view)
  }

  dispose () {
    this.subscriptions.dispose()
    this.subscriptions = null
  }

  commandInvoked () {
    const pkgMap: Map<string, Array<string>> = allPackages(this.goconfig)
    const pkgs = [].concat.apply([], Array.from(pkgMap.values()))
    this.view.show(pkgs)
  }

  async addImport (pkg: string) {
    const editor = getEditor()
    if (!editor) {
      return
    }
    const cmd = await this.goconfig.locator.findTool('goaddimport')
    if (!cmd) {
      return
    }

    const r = await this.goconfig.executor.exec(cmd, [], { input: editor.getText() })
    if (r.error && r.error.code === 'ENOENT') {
      // TODO: notification missing tool
      // TODO: move this logic into executor?
      return
    }
    if (r.exitcode === 0) {
      editor.getBuffer().setTextViaDiff(r.stdout)
    }
  }
}
