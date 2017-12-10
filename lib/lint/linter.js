// @flow

import path from 'path'
import {isValidEditor} from './../utils'

import type {Disposable, Point, Range} from 'atom'
import type {GoConfig} from './../config/service'
import type {ExecResult} from './../config/executor'

export type LinterV2Message = {
  name?: string,
  location: {
    file: string,
    position: Range,
  },
  reference?: {
    file: string,
    position?: Point,
  },
  url?: string,
  icon?: string,
  excerpt: string,
  severity: 'error' | 'warning' | 'info',
  solutions?: Array<{
    title?: string,
    position: Range,
    priority?: number,
    currentText?: string,
    replaceWith: string,
  } | {
    title?: string,
    position: Range,
    priority?: number,
    apply: (() => any),
  }>,
  description?: string | (() => Promise<string> | string),
  linterName?: string
}

export type LinterDelegate = {
  getMessages(): Array<LinterV2Message>,
  clearMessages(): void,
  setMessages(filePath: string, messages: Array<LinterV2Message>): void,
  setAllMessages(messages: Array<LinterV2Message>): void,
  onDidUpdate(callback: Function): Disposable,
  onDidDestroy(callback: Function): Disposable,
  dispose(): void
}

class GometalinterLinter {
  goconfig: GoConfig
  linter: () => LinterDelegate
  disposed: bool

  constructor (goconfig: GoConfig, linter: () => LinterDelegate) {
    this.goconfig = goconfig
    this.linter = linter
  }

  dispose () {
    this.disposed = true
  }

  deleteMessages () {
    const linter = this.linter()
    if (linter) {
      linter.clearMessages()
    }
  }

  setMessages (messages: Array<LinterV2Message>) {
    const linter = this.linter()
    if (linter && messages && messages.length) {
      linter.setAllMessages(messages)
    }
  }

  async lint (editor: any, path: string): Promise<void> {
    if (!isValidEditor(editor)) {
      return
    }

    const buffer = editor.getBuffer()
    if (!buffer) {
      return
    }
    this.deleteMessages()
    let args = atom.config.get('go-plus.lint.args')
    if (!args || args.constructor !== Array) {
      args = [
        '--vendor',
        '--disable-all',
        '--enable=vet',
        '--enable=vetshadow',
        '--enable=golint',
        '--enable=ineffassign',
        '--enable=goconst',
        '--tests',
        '--json',
        '.'
      ]
    }
    if (args.indexOf('--json') === -1) {
      args.unshift('--json')
    }

    const options = this.goconfig.executor.getOptions('file')
    const cmd = await this.goconfig.locator.findTool('gometalinter')
    if (!cmd) {
      return
    }
    const r: ExecResult = await this.goconfig.executor.exec(cmd, args, options)
    if (!r) {
      return
    }
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    if (stderr && stderr.trim() !== '') {
      console.log('gometalinter-linter: (stderr) ' + stderr)
    }
    let messages: Array<LinterV2Message> = []
    if (stdout && stdout.trim() !== '') {
      messages = this.mapMessages(stdout, editor, options.cwd || '')
    }
    this.setMessages(messages)
  }

  mapMessages (data: string, editor: any, cwd: string): Array<LinterV2Message> {
    let messages = []
    try {
      messages = JSON.parse(data)
    } catch (e) {
      console.log(e)
    }

    if (!messages || messages.length < 1) {
      return []
    }
    messages.sort((a, b) => {
      if (!a && !b) {
        return 0
      }
      if (!a && b) {
        return -1
      }
      if (a && !b) {
        return 1
      }

      if (!a.path && b.path) {
        return -1
      }
      if (a.path && !b.path) {
        return 1
      }
      if (a.path === b.path) {
        if (a.line - b.line === 0) {
          return a.row - b.row
        }
        return a.line - b.line
      } else {
        return a.path.localeCompare(b.path)
      }
    })

    const results: Array<LinterV2Message> = []

    for (const message of messages) {
      let range
      if (message.col && message.col >= 0) {
        range = [[message.line - 1, message.col - 1], [message.line - 1, 1000]]
      } else {
        range = [[message.line - 1, 0], [message.line - 1, 1000]]
      }
      results.push({
        linterName: message.linter,
        severity: message.severity.toLowerCase(),
        location: {
          file: path.join(cwd, message.path),
          position: range
        },
        excerpt: message.message + ' (' + message.linter + ')'
      })
    }

    return results
  }
}
export {GometalinterLinter}
