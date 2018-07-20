// @flow

import os from 'os'
import {CompositeDisposable} from 'atom'
import {buildGuruArchive, computeArgs} from './../guru-utils'
import {parseGoPosition, isValidEditor, getEditor} from './../utils'

import type {GoConfig} from './../config/service'
import type {PanelModel, Tab} from './../panel/tab'
import type UsageView from './usage-view'

export type Reference = {
  filename: string,
  row: number,
  column: number,
  text: string
}

class Usage implements PanelModel {
  goconfig: GoConfig
  key: string
  tab: Tab
  subscriptions: CompositeDisposable
  requestFocus: ?() => Promise<void>
  view: UsageView

  constructor (goconfig: GoConfig) {
    this.key = 'usage'
    this.tab = {
      name: 'Usage',
      packageName: 'go-plus',
      icon: 'telescope',
      order: 400,
      suppressPadding: true
    }
    this.subscriptions = new CompositeDisposable()
    this.goconfig = goconfig
    this.subscribeToCommands()
  }

  dispose () {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
  }

  subscribeToCommands () {
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'golang:find-usage': () => {
        if (isValidEditor(getEditor()) && this.goconfig && this.goconfig.locator) {
          const args = computeArgs('referrers')
          if (args) {
            this.exec(args)
          }
        }
      }
    }))
  }

  parseStream (jsonStream: string): Array<Object> {
    if (!jsonStream || !jsonStream.length) {
      return []
    }
    // A JSON stream is invalid json; characterized by a concatenation of
    // multiple JSON objects
    const r = new RegExp('^}$', 'igm')
    const result = []
    const objects = jsonStream.split(r)
    for (const obj of objects) {
      if (obj.trim() !== '') {
        result.push(JSON.parse(obj + '}'))
      }
    }
    return result
  }

  parse (obj: Array<Object>): ?Object {
    if (!obj || !obj.length) {
      return undefined
    }

    const result: Map<string, Array<Reference>> = new Map()
    for (const pkg of obj.slice(1)) {
      if (!pkg || !pkg.refs || !pkg.refs.length) {
        continue
      }
      const refs: Array<Reference> = []
      for (const ref of pkg.refs) {
        const parsed = parseGoPosition(ref.pos)
        if (parsed && typeof parsed.column === 'number' && typeof parsed.line === 'number') {
          refs.push({filename: parsed.file, row: parsed.line, column: parsed.column, text: ref.text})
        }
      }
      result.set(pkg.package, refs)
    }

    return {initial: obj[0], packages: result}
  }

  updateContent (content: string | {packages: Map<string, Array<Reference>>}, state: 'success' | 'running' | 'error' | 'initial') {
    let props = {}
    if (state === 'running' || state === 'error' || state === 'initial') {
      props.content = content
    } else {
      if (!content || !content.packages || !content.packages.size) {
        props.content = 'No usage found...'
      } else {
        props.content = {
          raw: content,
          referrers: content.packages
        }
      }
    }

    if (this.requestFocus) {
      this.requestFocus().then(() => {
        if (this.view) {
          this.view.update(props)
        }
      })
    }
  }

  async exec (args: Array<string>) {
    if (!this.goconfig || !this.goconfig.executor) {
      return
    }
    this.updateContent('Running guru ' + args.join(' ') + '...', 'running')
    const options = {}
    options.timeout = 30000
    const archive = buildGuruArchive()
    if (archive && archive.length) {
      options.input = archive
      args.unshift('-modified')
    }
    const cmd = await this.goconfig.locator.findTool('guru')
    if (!cmd) {
      return false
    }
    const r = await this.goconfig.executor.exec(cmd, args, options)
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    if (r.error || r.exitcode !== 0 || (stderr.trim() !== '')) {
      let message
      if (r.exitcode === 124) {
        message = `operation timed out after ${options.timeout} ms`
      } else {
        message = stderr.trim() + os.EOL + stdout.trim()
        if (r.error && r.error.message) {
          message = r.error.message + os.EOL + message
        }
      }
      const content = 'guru failed:' + os.EOL + message
      this.updateContent(content, 'error')
      return false
    }

    const stream = this.parseStream(stdout)
    const refs = this.parse(stream)
    if (refs) {
      this.updateContent(refs, 'success')
    }
    return true
  }
}

export {Usage}
