// @flow

import os from 'os'
import { CompositeDisposable, Disposable } from 'atom'
import { SimpleDialog } from './../simple-dialog'
import { promiseWaterfall } from './../promise'
import type { GoConfig } from './../config/service'
import type { ExecResult } from './../config/executor'
import type { OutputManager } from './../output-manager'

type GetResult = {
  execResult: ExecResult,
  cmd: string,
  pack: string,
  args: Array<string>
}

export type MultiGetResult = {
  success: boolean,
  result: ?GetResult,
  results: ?Array<GetResult>
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
  busySignal: () => ?BusySignalService
  packages: Map<string, number>
  onDidUpdateTools: Set<(MultiGetResult, Array<string>) => void>
  subscriptions: CompositeDisposable

  constructor(
    goconfig: GoConfig,
    outputFunc: () => OutputManager,
    busySignal: () => ?BusySignalService
  ) {
    this.goconfig = goconfig
    this.outputFunc = outputFunc
    this.busySignal = busySignal
    this.packages = new Map()
    this.onDidUpdateTools = new Set()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.commands.add(
        atom.views.getView(atom.workspace),
        'golang:get-package',
        () => this.getPackage()
      )
    )
    this.subscriptions.add(
      atom.commands.add(
        atom.views.getView(atom.workspace),
        'golang:update-tools',
        event => {
          this.outputFunc().update({
            output: 'Updating tools...',
            exitcode: 1
          })
          let filter = []
          if (event && event.detail && Array.isArray(event.detail)) {
            filter = event.detail
          }
          this.updateTools(filter)
        }
      )
    )
  }

  getSelectedText() {
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

  register(
    importPath: string,
    callback: ?(MultiGetResult, Array<string>) => void
  ): Disposable {
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

    if (
      callback &&
      this.onDidUpdateTools &&
      !this.onDidUpdateTools.has(callback)
    ) {
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
      if (
        callback &&
        this.onDidUpdateTools &&
        this.onDidUpdateTools.has(callback)
      ) {
        this.onDidUpdateTools.delete(callback)
      }
    })
  }

  async updateTools(filter: Array<string>): Promise<MultiGetResult> {
    if (!this.packages || this.packages.size === 0) {
      return { success: false, result: null, results: null }
    }

    let packs = [...this.packages.keys()]
    if (filter && Array.isArray(filter) && filter.length > 0) {
      packs = filter
    }
    const bs = this.busySignal()
    const getPromise = this.performGet(packs)
    const p = bs
      ? bs.reportBusyWhile('Updating Go Tools', () => getPromise)
      : getPromise
    const outcome = await p
    if (this.onDidUpdateTools) {
      for (const cb of this.onDidUpdateTools) {
        cb(outcome, packs)
      }
    }
    return outcome
  }

  // Shows a dialog which can be used to perform `go get -u {pack}`. Optionally
  // populates the dialog with the selected text from the active editor.
  getPackage() {
    const selectedText = this.getSelectedText()
    const dialog = new SimpleDialog({
      prompt: 'Which Go Package Would You Like To Get?',
      initialValue: selectedText,
      onConfirm: pkg => {
        this.performGet(pkg)
          .then(
            outcome =>
              outcome &&
              outcome.result &&
              outcome.result.execResult &&
              this.displayResult(pkg, outcome.result.execResult)
          )
          .catch(e => console.log(e)) // eslint-disable-line no-console
      }
    })
    dialog.attach()
  }

  displayResult(pack: string, r: ExecResult) {
    if (r.error) {
      if (r.error.code === 'ENOENT') {
        atom.notifications.addError('Missing Go Tool', {
          detail:
            'The go tool is required to perform a get. Please ensure you have a go runtime installed: http://golang.org.',
          dismissable: true
        })
      } else {
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
  async performGet(pack: string | Array<string>): Promise<MultiGetResult> {
    if (typeof pack === 'string') {
      pack = [pack]
    }

    const packages: Array<string> = pack.filter(p => p.length > 0)
    if (pack.length === 0 || !this.goconfig || !this.goconfig.locator) {
      return { success: false, result: null, results: null }
    }
    const cmd = await this.goconfig.locator.findTool('go')
    if (!cmd) {
      atom.notifications.addError('Missing Go Tool', {
        detail:
          'The go tool is required to perform a get. Please ensure you have a go runtime installed: http://golang.org.',
        dismissable: true
      })
      return { success: false, result: null, results: null }
    }

    const executorOptions = this.goconfig.executor.getOptions('project')
    const timeout = atom.config.get('go-plus.get.timeout')
    if (typeof timeout === 'number') {
      executorOptions.timeout = timeout
    }

    // disable Go 1.11 modules, so that updating tools does not inadvertently
    // add new dependencies to the user's project
    executorOptions.env = {
      ...executorOptions.env,
      GO111MODULE: 'off'
    }

    let getOutput = ''
    const promises: Array<() => Promise<GetResult>> = packages.map(
      pkg => async (): Promise<GetResult> => {
        const args = ['get', '-u', pkg]
        getOutput += '$ go ' + args.join(' ') + os.EOL
        this.outputFunc().update({ output: getOutput })
        const r = await this.goconfig.executor.exec(cmd, args, executorOptions)
        const result: GetResult = {
          execResult: r,
          cmd,
          pack: pkg,
          args: args
        }
        const stdout =
          r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
        const stderr =
          r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr

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
      }
    )

    const results: Array<GetResult> = await promiseWaterfall(promises)
    if (!results || results.length < 1) {
      return { success: false, result: null, results: null }
    }
    let success = true
    for (const r of results) {
      const er = r.execResult
      const stderr =
        er.stderr instanceof Buffer ? er.stderr.toString() : er.stderr
      if (er.error || er.exitcode !== 0 || (stderr && stderr.trim() !== '')) {
        success = false
        break
      }
    }
    return { success: success, result: results[0], results: results }
  }

  // Creates a notification that can be used to run `go get -u {options.packagePath}`.
  // * `options` (required) {Object}
  //   * `name` (required) {String} e.g. go-plus
  //   * `packageName` (required) {String} e.g. goimports
  //   * `packagePath` (required) {String} e.g. golang.org/x/tools/cmd/goimports
  //   * `type` (required) {String} one of 'missing' or 'outdated' (used to customize the prompt)
  async get(options: InteractiveGetOptions): Promise<?MultiGetResult> {
    if (
      !options ||
      !options.name ||
      !options.packageName ||
      !options.packagePath ||
      !options.type
    ) {
      return null
    }
    if (!['missing', 'outdated'].includes(options.type)) {
      return null
    }

    const detail =
      options.type === 'outdated'
        ? `An update is available for the ${
            options.packageName
          } tool.  This is used by the ${options.name} package.`
        : `The ${options.name} package uses the ${
            options.packageName
          } tool, but it cannot be found.`

    const p: Promise<?MultiGetResult> = new Promise(resolve => {
      let wasClicked = false
      const notification = atom.notifications.addInfo('Go Get', {
        dismissable: true,
        icon: 'cloud-download',
        detail: detail,
        description:
          'Would you like to run `go get -u` [`' +
          options.packagePath +
          '`](http://' +
          options.packagePath +
          ')?',
        buttons: [
          {
            text: 'Run Go Get',
            onDidClick: async () => {
              wasClicked = true
              notification.dismiss()
              const outcome: MultiGetResult = await this.performGet(
                options.packagePath
              )
              if (outcome && outcome.result && outcome.result.execResult)
                this.displayResult(
                  options.packagePath,
                  outcome.result.execResult
                )
              resolve(outcome)
            }
          }
        ]
      })
      notification.onDidDismiss(() => {
        if (!wasClicked) {
          resolve(null)
        }
      })
    })
    return await p
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.packages.clear()
    this.onDidUpdateTools.clear()
  }
}
export { GetManager }
