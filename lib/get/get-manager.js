'use babel'

import {CompositeDisposable, Disposable} from 'atom'
import {GetDialog} from './get-dialog'
import os from 'os'
import {promiseWaterfall} from './../promise'

class GetManager {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.packages = new Map()
    this.onDidUpdateTools = new Set()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add(atom.views.getView(atom.workspace), 'golang:get-package', () => {
      this.getPackage()
    }))
    this.subscriptions.add(atom.commands.add(atom.views.getView(atom.workspace), 'golang:update-tools', (event) => {
      const progress = atom.notifications.addInfo('Updating Tools...', {dismissable: true})
      let filter = false
      if (event && event.detail && Array.isArray(event.detail)) {
        filter = event.detail
      }
      this.updateTools(filter).then((outcome) => {
        progress.dismiss()
        if (!outcome) {
          return
        }

        this.displayResults(outcome)
      })
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

  register (importPath, callback) {
    if (!importPath || !importPath.length) {
      return
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
      const count = this.packages.get(importPath)
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

  updateTools (filter) {
    if (!this.packages || this.packages.size === 0) {
      return Promise.resolve()
    }

    let packs = [...this.packages.keys()]
    if (filter && Array.isArray(filter) && filter.length > 0) {
      packs = filter
    }
    return this.performGet(packs).then((outcome) => {
      if (this.onDidUpdateTools) {
        for (const cb of this.onDidUpdateTools) {
          cb(outcome, packs)
        }
      }
      return outcome
    })
  }

  // Shows a dialog which can be used to perform `go get -u {pack}`. Optionally
  // populates the dialog with the selected text from the active editor.
  getPackage () {
    const selectedText = this.getSelectedText()
    const dialog = new GetDialog(selectedText, (pack) => {
      this.performGet(pack).then((outcome) => {
        this.displayResult(pack, outcome)
      })
    })
    dialog.attach()
  }

  displayResults (outcome) {
    let detail = ''
    for (const result of outcome.results) {
      let item = 'go ' + result.args.join(' ')
      if (result.stdout && result.stdout.trim().length) {
        item = item + os.EOL + result.stdout
      }
      if (result.stderr && result.stderr.trim().length) {
        item = item + os.EOL + result.stderr
      }
      item = item + os.EOL
      detail = detail + item
    }
    detail = detail.trim()

    if (outcome.success) {
      atom.notifications.addSuccess('Updated Tools', {
        dismissable: true,
        icon: 'cloud-download',
        detail: detail
      })
    } else {
      atom.notifications.addError('Updating Tools', {
        dismissable: true,
        icon: 'cloud-download',
        detail: detail
      })
    }
  }

  displayResult (pack, outcome) {
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
          detail: r.error.message,
          dismissable: true
        })
      }
      return
    }

    if (r.exitcode !== 0 || (r.stderr && r.stderr.trim() !== '')) {
      const message = r.stderr.trim() + '\r\n' + r.stdout.trim()
      atom.notifications.addWarning('Error Getting Package', {
        detail: message.trim(),
        dismissable: true
      })
      return
    }

    atom.notifications.addSuccess('go get -u ' + pack)
  }

  // Runs `go get -u {pack}`.
  // * `options` (optional) {Object} to pass to the go-config executor.
  performGet (pack, options = {}) {
    if (!pack) {
      return Promise.resolve(false)
    }
    if (!Array.isArray(pack) && typeof pack === 'string' && pack.trim() !== '') {
      pack = [pack]
    }
    if (!Array.isArray(pack) || pack.length < 1) {
      return Promise.resolve(false)
    }

    if (!this.goconfig || !this.goconfig.locator) {
      return Promise.resolve(false)
    }

    return this.goconfig.locator.findTool('go').then((cmd) => {
      if (!cmd) {
        atom.notifications.addError('Missing Go Tool', {
          detail: 'The go tool is required to perform a get. Please ensure you have a go runtime installed: http://golang.org.',
          dismissable: true
        })
        return {success: false}
      }

      const promises = []
      const executorOptions = this.goconfig.executor.getOptions('file')
      executorOptions.timeout = atom.config.get('go-plus.get.timeout')
      for (const pkg of pack) {
        const args = ['get', '-u', pkg]
        promises.push(() => {
          return this.goconfig.executor.exec(cmd, args, executorOptions).then((r) => {
            r.cmd = cmd
            r.pack = pkg
            r.args = args
            return r
          })
        })
      }

      return promiseWaterfall(promises).then((results) => {
        if (!results || results.length < 1) {
          return {success: false, r: null}
        }

        let success = true
        const result = results[0]

        for (const r of results) {
          if (r.error || r.exitcode !== 0 || (r.stderr && r.stderr.trim() !== '')) {
            success = false
          }
        }

        return {success: success, result: result, results: results}
      })
    })
  }

  // Creates a notification that can be used to run `go get -u {options.packagePath}`.
  // * `options` (required) {Object}
  //   * `name` (required) {String} e.g. go-plus
  //   * `packageName` (required) {String} e.g. goimports
  //   * `packagePath` (required) {String} e.g. golang.org/x/tools/cmd/goimports
  //   * `type` (required) {String} one of 'missing' or 'outdated' (used to customize the prompt)
  get (options) {
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
          onDidClick: () => {
            wasClicked = true
            notification.dismiss()
            resolve(this.performGet(options.packagePath).then((outcome) => {
              this.displayResult(options.packagePath, outcome)
            }))
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
    this.goconfig = null
    this.packages = null
    this.onDidUpdateTools = null
  }
}
export {GetManager}
