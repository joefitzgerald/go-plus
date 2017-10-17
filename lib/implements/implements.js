'use babel'

import os from 'os'
import {CompositeDisposable} from 'atom'
import {isValidEditor, getEditor} from './../utils'
import {buildGuruArchive, computeArgs} from './../guru-utils'

export default class Implements {
  constructor (goconfig) {
    this.goconfig = goconfig

    this.key = 'implements'
    this.tab = {
      name: 'Implements',
      packageName: 'go-plus',
      icon: 'tasklist',
      order: 450,
      suppressPadding: true
    }

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'golang:implements': () => { this.handleCommand() }
    }))
  }

  handleCommand () {
    if (!this.goconfig || !this.goconfig.locator || !this.goconfig.executor) {
      return
    }
    const editor = getEditor()
    if (!isValidEditor(editor)) {
      return
    }
    const args = computeArgs('implements', {})
    return this.runGuru(args)
  }

  runGuru (args) {
    const options = {timeout: 20000}
    const archive = buildGuruArchive()
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }
    const promise = this.requestFocus ? this.requestFocus() : Promise.resolve()
    return promise.then(() => {
      if (this.view) {
        this.view.update('running guru ' + args.join(' '))
      }
      return this.goconfig.locator.findTool('guru').then((cmd) => {
        if (!cmd) {
          return false
        }
        return this.goconfig.executor.exec(cmd, args, options).then((r) => {
          if (r.error || r.exitcode !== 0 || (r.stderr && r.stderr.trim() !== '')) {
            if (this.view) {
              if (r.exitcode === 124) {
                this.view.update(`guru failed: operation timed out after ${options.timeout} ms`)
              } else {
                this.view.update('guru failed' + os.EOL + os.EOL + r.stderr.trim())
              }
            }
            return false
          }
          return JSON.parse(r.stdout)
        }).then((obj) => {
          if (obj && this.requestFocus) {
            this.requestFocus().then(() => {
              if (this.view) {
                this.view.update(obj)
              }
            })
          }
        })
      })
    })
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
      this.subscriptions = null
    }
  }
}
