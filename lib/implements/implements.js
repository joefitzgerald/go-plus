// @flow

import os from 'os'
import {CompositeDisposable} from 'atom'
import {getEditor} from './../utils'
import {buildGuruArchive, computeArgs} from './../guru-utils'

import type {GoConfig} from './../config/service'
import type {PanelModel, Tab} from './../panel/tab'

class Implements implements PanelModel {
  key: string
  tab: Tab
  goconfig: GoConfig
  subscriptions: CompositeDisposable
  requestFocus: ?() => Promise<void>
  view: any

  constructor (goconfig: GoConfig) {
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
    if (!editor) {
      return
    }
    const args = computeArgs('implements')
    if (args && args.length) {
      return this.runGuru(args)
    }
  }

  async runGuru (args: Array<string>) {
    const options = {}
    options.timout = 20000
    const archive = buildGuruArchive()
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }
    if (this.requestFocus) {
      await this.requestFocus()
    }
    if (this.view) {
      this.view.update('running guru ' + args.join(' '))
    }
    const cmd = await this.goconfig.locator.findTool('guru')
    if (!cmd) {
      return false
    }
    const r = await this.goconfig.executor.exec(cmd, args, options)
    if (!r) {
      return false
    }

    const stderr: string = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    if (r.error || r.exitcode !== 0 || (stderr && stderr.trim() !== '')) {
      if (this.view) {
        if (r.exitcode === 124) {
          this.view.update(`guru failed: operation timed out after ${options.timeout} ms`)
        } else {
          this.view.update('guru failed' + os.EOL + os.EOL + stderr.trim())
        }
      }
      return false
    }
    const stdout: string = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    const obj = JSON.parse(stdout)
    if (obj && this.requestFocus) {
      this.requestFocus().then(() => {
        if (this.view) {
          this.view.update(obj)
        }
      })
    }
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
      this.subscriptions = null
    }
  }
}

export {Implements}
