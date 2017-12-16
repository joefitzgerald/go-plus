// @flow
'use babel'

import os from 'os'
import {CompositeDisposable, Disposable} from 'atom'
import SimpleDialog from './../simple-dialog'
import {promiseWaterfall} from './../promise'
import type {GoConfig} from './../config/service'
import type {ExecResult} from './../config/executor'
import type {OutputManager} from './../output-manager'

type GetResult = {
  ...ExecResult,
  cmd: string,
  pack: string,
  args: Array<string>,
}

export type InteractiveGetOptions = {
  name: string,
  packageName: string,
  packagePath: string,
  type: 'missing' | 'outdated'
}

class GetManager {
  goconfig: GoConfig
  outputFunc: () => OutputManager
  packages: Map<string, number>
  onDidUpdateTools: Set<(any, Array<string>) => void>
  subscriptions: CompositeDisposable

  constructor (goconfig: GoConfig, outputFunc: Function) {
    this.goconfig = goconfig
    this.outputFunc = outputFunc
    this.packages = new Map()
    this.onDidUpdateTools = new Set()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(atom.views.getView(atom.workspace),
      'golang:get-package', () => { this.getPackage() }))
    this.subscriptions.add(atom.commands.add(atom.views.getView(atom.workspace),
      'golang:update-tools', (event) => {
        this.outputFunc().update({
          output: 'Updating tools...',
          exitcode: 1
        })
        let filter = []
        if (event && event.detail && Array.isArray(event.detail)) {
          filter = event.detail
        }
        this.updateTools(filter)
      }))
  }

  getSelectedText () {
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      return ''
    }
    const selections = editor.getSelections()
    if (!selections || selections.length < 1) {
      return ''
    }

    return selections[0].getText()
  }

  register (importPath: string, callback: ?Function /* TODO */): Disposable {
    if (!importPath || !importPath.length) {
      return new Disposable()
    }
    let count = 1
    if (this.packages && this.packages.has(importPath)) {
      count = this.packages.get(importPath) + 1
    }
    if (this.packages) {
      this.packages.set(importPath, count)
    }

    if (callback && this.onDidUpdateTools && !this.onDidUpdateTools.has(callback)) {
      this.onDidUpdateTools.add(callback)
    }

    return new Disposable(() => {
      if (!this.packages) {
        return
      }
      const count = this.packages.get(importPath) || 0
      if (count === 1) {
        this.packages.delete(importPath)
      } else if (count > 1) {
        this.packages.set(importPath, count - 1)
      }
      if (callback && this.onDidUpdateTools && this.onDidUpdateTools.has(callback)) {
        this.onDidUpdateTools.delete(callback)
      }
    })
  }

  async updateTools (filter: Array<string>): Promise<any> {
    if (!this.packages || this.packages.size === 0) {
      return
    }

    let packs = [...this.packages.keys()]
    if (filter && Array.isArray(filter) && filter.length > 0) {
      packs = filter
    }
    const outcome = await this.performGet(packs)
    if (this.onDidUpdateTools) {
      for (const cb of this.onDidUpdateTools) {
        cb(outcome, packs)
      }
    }
    return outcome
  }

  // Shows a dialog which can be used to perform `go get -u {pack}`. Optionally
  // populates the dialog with the selected text from the active editor.
  getPackage () {
    const selectedText = this.getSelectedText()
    const dialog = new SimpleDialog({
      prompt: 'Which Go Package Would You Like To Get?',
      initialValue: selectedText,
      onConfirm: (pack) => {
        this.performGet(pack).then((outcome) => {
          this.displayResult(pack, outcome)
        })
      }
    })
    dialog.attach()
  }

  displayResult (pack: string, outcome: {result: ExecResult}) {
    const r = outcome.result
    if (r.error) {
      if (r.error.code === 'ENOENT') {
        atom.notifications.addError('Missing Go Tool', {
          detail: 'The go tool is required to perform a get. Please ensure you have a go runtime installed: http://golang.org.',
          dismissable: true
        })
      } else {
        console.log(r.error)
        atom.notifications.addError('Error Getting Package', {
          detail: r.error && r.error.message ? r.error.message : '',
          dismissable: true
        })
      }
      return
    }
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout

    if (r.exitcode !== 0 || (stderr && stderr.trim() !== '')) {
      const message = stderr.trim() + '\r\n' + stdout.trim()
      atom.notifications.addWarning('Error Getting Package', {
        detail: message.trim(),
        dismissable: true
      })
      return
    }

    atom.notifications.addSuccess('go get -u ' + pack)
  }

  // Runs `go get -u {pack}`.
  async performGet (pack: string | Array<string>): Promise<any> {
    if (typeof pack === 'string') {
      pack = [pack]
    }

    const packages: Array<string> = pack.filter(p => p.length > 0)
    if (pack.length === 0 || !this.goconfig || !this.goconfig.locator) {
      return false
    }
    const cmd = await this.goconfig.locator.findTool('go')
    if (!cmd) {
      atom.notifications.addError('Missing Go Tool', {
        detail: 'The go tool is required to perform a get. Please ensure you have a go runtime installed: http://golang.org.',
        dismissable: true
      })
      return {success: false}
    }

    const executorOptions = this.goconfig.executor.getOptions('file')
    executorOptions.timeout = atom.config.get('go-plus.get.timeout')

    let getOutput = ''
    const promises: Array<() => Promise<any>> = packages.map((pkg) => async (): Promise<any> => {
      const args = ['get', '-u', pkg]
      getOutput += '$ go ' + args.join(' ') + os.EOL
      this.outputFunc().update({output: getOutput})
      const r = await this.goconfig.executor.exec(cmd, args, executorOptions)
      const result: GetResult = {
        ...r,
        cmd,
        pack: pkg,
        args: args
      }
      const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
      const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr

      if (stderr && stderr.length) {
        getOutput += stderr + os.EOL
      }
      if (stdout && stdout.length) {
        getOutput += stdout + os.EOL
      }
      this.outputFunc().update({
        output: getOutput
      })

      return result
    })

    const results = await promiseWaterfall(promises)
    if (!results || results.length < 1) {
      return {success: false, r: null}
    }
    let success = true
    for (const r of results) {
      if (r.error || r.exitcode !== 0 || (r.stderr && r.stderr.trim() !== '')) {
        success = false
      }
    }
    return {success: success, result: results[0], results: results}
  }

  // Creates a notification that can be used to run `go get -u {options.packagePath}`.
  // * `options` (required) {Object}
  //   * `name` (required) {String} e.g. go-plus
  //   * `packageName` (required) {String} e.g. goimports
  //   * `packagePath` (required) {String} e.g. golang.org/x/tools/cmd/goimports
  //   * `type` (required) {String} one of 'missing' or 'outdated' (used to customize the prompt)
  get (options: InteractiveGetOptions): Promise<any> {
    if (!options || !options.name || !options.packageName || !options.packagePath || !options.type) {
      return Promise.resolve(false)
    }
    if (['missing', 'outdated'].indexOf(options.type) === -1) {
      return Promise.resolve(false)
    }

    let detail = 'The ' + options.name + ' package uses the ' + options.packageName + ' tool, but it cannot be found.'
    if (options.type === 'outdated') {
      detail = 'An update is available for the ' + options.packageName + ' tool. This is used by the ' + options.name + ' package.'
    }
    return new Promise((resolve) => {
      let wasClicked = false
      const notification = atom.notifications.addInfo('Go Get', {
        dismissable: true,
        icon: 'cloud-download',
        detail: detail,
        description: 'Would you like to run `go get -u` [`' + options.packagePath + '`](http://' + options.packagePath + ')?',
        buttons: [{
          text: 'Run Go Get',
          onDidClick: async () => {
            wasClicked = true
            notification.dismiss()
            const outcome = await this.performGet(options.packagePath)
            this.displayResult(options.packagePath, outcome)
            resolve(outcome)
          }
        }]
      })
      notification.onDidDismiss(() => {
        if (!wasClicked) {
          resolve(false)
        }
      })
    })
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.packages.clear()
    this.onDidUpdateTools.clear()
  }
}
export {GetManager}
