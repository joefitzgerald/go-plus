'use babel'

import {CompositeDisposable} from 'atom'
import path from 'path'

function capitalizeFirstLetter (str) {
  if (!str) {
    return str
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}

class GometalinterLinter {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()

    this.name = 'gometalinter'
    this.grammarScopes = ['source.go']
    this.scope = 'project'
    this.lintOnFly = false
  }

  dispose () {
    this.disposed = true
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
    this.name = null
    // Linter should check whether a linter is disposed, but it doesn't
    // this.grammarScopes = null
    this.lintOnFly = null
  }

  ready () {
    if (!this.goconfig) {
      return false
    }

    return true
  }

  lint (editor) {
    if (!this.ready() || !editor) {
      return []
    }

    const buffer = editor.getBuffer()
    if (!buffer) {
      return []
    }
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
        return []
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
          return []
        }
        return messages
      }).catch((e) => {
        console.log(e)
        return []
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
        name: message.linter,
        type: capitalizeFirstLetter(message.severity),
        row: message.line,
        column: message.col,
        text: message.message + ' (' + message.linter + ')',
        filePath: path.join(cwd, message.path),
        range: range})
    }

    return results
  }
}
export {GometalinterLinter}
