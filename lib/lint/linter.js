'use babel'

import path from 'path'
import {isValidEditor} from './../utils'

class GometalinterLinter {
  constructor (goconfig, linter) {
    this.goconfig = goconfig
    this.linter = linter
  }

  dispose () {
    this.disposed = true
    this.goconfig = null
  }

  deleteMessages () {
    const linter = this.linter()
    if (linter) {
      linter.clearMessages()
    }
  }

  setMessages (messages) {
    const linter = this.linter()
    if (linter && messages && messages.length) {
      linter.setAllMessages(messages)
    }
  }

  lint (editor, path) {
    if (!isValidEditor(editor)) {
      return Promise.resolve(true)
    }

    const buffer = editor.getBuffer()
    if (!buffer) {
      return Promise.resolve(true)
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

    return this.goconfig.locator.findTool('gometalinter').then((cmd) => {
      if (!cmd) {
        return true
      }

      const options = this.goconfig.executor.getOptions('file')
      return this.goconfig.executor.exec(cmd, args, options).then((r) => {
        if (r.stderr && r.stderr.trim() !== '') {
          console.log('gometalinter-linter: (stderr) ' + r.stderr)
        }
        let messages = []
        if (r.stdout && r.stdout.trim() !== '') {
          messages = this.mapMessages(r.stdout, editor, options.cwd)
        }
        if (!messages || messages.length < 1) {
          return true
        }
        return messages
      }).then((messages) => {
        this.setMessages(messages)
      }).catch((e) => {
        // always catch here - lint failures should not prevent downstream
        // orchestrator tasks from running
        console.log(e)
        return false
      })
    })
  }

  mapMessages (data, editor, cwd) {
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

    const results = []

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
