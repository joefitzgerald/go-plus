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
      'atom-text-editor[data-grammar~="go"]:not([mini])', 'golang:import-package',
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
      return {success: false}
    }
    const cmd = await this.goconfig.locator.findTool('goaddimport')
    if (!cmd) {
      atom.notifications.addError('Missing Tool', {
        detail: 'Unable to find the `goaddimport` tool.',
        dismissable: true
      })
      return {success: false}
    }
    const r = await this.goconfig.executor.exec(cmd, [pkg], { input: editor.getText() })
    if (r.error) {
      atom.notifications.addError('Error', {
        detail: r.error.message,
        dismissable: true
      })
      return {success: false, r}
    }

    if (r.exitcode === 0) {
      editor.getBuffer().setTextViaDiff(r.stdout)
      return {success: true, r}
    }

    return {success: false, r}
  }
}

export {Importer, importablePackages}
