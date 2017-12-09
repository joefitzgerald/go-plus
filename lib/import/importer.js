// @flow

import {CompositeDisposable} from 'atom'
import path from 'path'
import ImporterView from './importer-view'
import {getEditor} from './../utils'
import {allPackages} from './../go'
import * as gcph from './../autocomplete/gocodeprovider-helper'

import type {GoConfig} from './../config/service'

// Filters an array of all possible import paths into those that are importable
// from some source package.
const importablePackages = (sourceImportPath: string, packages: Array<string>): Array<string> => {
  return packages.filter(pkg => {
    // filter out unimportable vendor and internal packages
    // https://golang.org/cmd/go/#hdr-Internal_Directories
    // https://golang.org/cmd/go/#hdr-Vendor_Directories
    const vendor = pkg.indexOf('/vendor/')
    const internal = pkg.indexOf('/internal/')

    if (vendor >= 0) {
      const vendorRoot = pkg.substr(0, vendor)
      if (!sourceImportPath.startsWith(vendorRoot)) {
        return false
      }
    }
    if (internal >= 0) {
      const internalRoot = pkg.substr(0, internal)
      if (!sourceImportPath.startsWith(internalRoot)) {
        return false
      }
    }

    return true
  }).map(pkg => {
    // strip prefix from vendored packages
    // (the import should appear the same as non-vendored)
    const vs = '/vendor/'
    const vendor = pkg.indexOf(vs)
    if (vendor === -1) {
      return pkg
    }
    return pkg.substr(vendor + vs.length)
  })
}

class Importer {
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
    const editor = getEditor()
    if (editor) {
      const dir = path.dirname(editor.getPath())
      const workspace = gcph.getCurrentGoWorkspaceFromGOPATH(
        this.goconfig.locator.gopath(), dir)

      // get the import path of the package we're currently editing
      const currentPkg = dir.replace(new RegExp(`^${workspace}/`), '')

      const importable = importablePackages(currentPkg, pkgs)
      this.view.show(importable)
    }
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

    const r = await this.goconfig.executor.exec(cmd, [pkg], { input: editor.getText() })
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

export {Importer, importablePackages}
