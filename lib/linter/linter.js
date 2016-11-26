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
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
    this.name = null
    this.grammarScopes = null
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
    let args = atom.config.get('go-plus.gometalinter.args')
    if (!args || args.constructor !== Array) {
      args = ['--vendor', '--fast', '--json', './...']
    }
    if (args.indexOf('--json') === -1) {
      args.unshift('--json')
    }

    const options = this.getLocatorOptions(editor)
    return this.goconfig.locator.findTool('gometalinter', options).then((cmd) => {
      if (!cmd) {
        return []
      }

      const options = this.getExecutorOptions(editor)
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

  getLocatorOptions (editor = atom.workspace.getActiveTextEditor()) {
    const options = {}
    if (editor) {
      options.file = editor.getPath()
      if (options.file) {
        options.directory = path.dirname(options.file)
      }
    }
    if (!options.directory) {
      const paths = atom.project.getPaths()
      if (paths.length) {
        options.directory = paths[0]
      }
    }

    return options
  }

  getExecutorOptions (editor = atom.workspace.getActiveTextEditor()) {
    const o = this.getLocatorOptions(editor)
    const options = {}
    if (o.directory) {
      options.cwd = o.directory
    }
    if (this.goconfig) {
      options.env = this.goconfig.environment(o)
    }
    if (!options.env) {
      options.env = process.env
    }
    return options
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
