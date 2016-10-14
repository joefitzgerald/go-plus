'use babel'

import {CompositeDisposable} from 'atom'
import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import temp from 'temp'

class Builder {
  constructor (goconfigFunc) {
    this.goconfig = goconfigFunc
    this.subscriptions = new CompositeDisposable()

    this.name = 'go build'
    this.grammarScopes = ['source.go']
    this.scope = 'project'
    this.lintOnFly = false
    temp.track()
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
    let config = this.goconfig()
    if (!config) {
      return false
    }

    return true
  }

  lint (editor) {
    if (!this.ready() || !editor) {
      return []
    }
    let p = editor.getPath()
    if (!p) {
      return []
    }
    return Promise.resolve().then(() => {
      let config = this.goconfig()
      let options = this.getLocatorOptions(editor)
      return config.locator.findTool('go', options).then((cmd) => {
        if (!cmd) {
          return []
        }

        let options = this.getExecutorOptions(editor)
        let buildPromise = this.lintInstall(cmd, options)

        let testPromise = Promise.resolve({ output: '', linterName: 'test' })
        if (this.hasTests(p)) {
          testPromise = this.lintTest(cmd, options)
        }

        return Promise.all([buildPromise, testPromise]).then((results) => this.getMessages(results, options.cwd))
      })
    }).catch((error) => {
      if (error.handle) {
        error.handle()
      }
      console.log(error)
      return []
    })
  }

  getMessages (results, cwd) {
    let messages = []
    for (let { output, linterName } of results) {
      let newMessages = this.mapMessages(output, cwd, linterName)
      for (let newMessage of newMessages) {
        if (!messages.some((message) => this.messageEquals(newMessage, message))) {
          messages = messages.concat(newMessage)
        }
      }
    }
    // add the "(<name>)" postfix to each message
    for (let message of messages) {
      message.text += ' (' + message.name + ')'
    }
    return messages
  }

  messageEquals (m1, m2) {
    return m1.filePath === m2.filePath &&
      m1.row === m2.row &&
      m1.text === m2.text &&
      JSON.stringify(m1.range) === JSON.stringify(m2.range)
  }

  lintInstall (cmd, options) {
    let buildArgs = ['install', '.']
    return this.goconfig().executor.exec(cmd, buildArgs, options).then((r) => {
      if (r.stdout && r.stdout.trim() !== '') {
        console.log('builder-go: (stdout) ' + r.stdout)
      }
      return { output: r.stderr.trim(), linterName: 'build' }
    }).catch((e) => {
      console.log(e)
      return { output: '', linterName: 'build' }
    })
  }

  lintTest (cmd, options) {
    let tempdir = fs.realpathSync(temp.mkdirSync())
    let testArgs = ['test', '-c', '-o', tempdir, '.']
    return this.goconfig().executor.exec(cmd, testArgs, options).then((r) => {
      if (r.stdout && r.stdout.trim() !== '') {
        console.log('builder-go: (stdout) ' + r.stdout)
      }
      rimraf(tempdir, (e) => {
        if (e) {
          if (e.handle) {
            e.handle()
          }
          console.log(e)
        }
      })
      return { output: r.stderr.trim(), linterName: 'test' }
    }).catch((e) => {
      console.log(e)
      return { output: '', linterName: 'test' }
    })
  }

  getLocatorOptions (editor = atom.workspace.getActiveTextEditor()) {
    let options = {}
    if (editor) {
      options.file = editor.getPath()
      options.directory = path.dirname(editor.getPath())
    }
    if (!options.directory && atom.project.paths.length) {
      options.directory = atom.project.paths[0]
    }

    return options
  }

  getExecutorOptions (editor = atom.workspace.getActiveTextEditor()) {
    let o = this.getLocatorOptions(editor)
    let options = {}
    if (o.directory) {
      options.cwd = o.directory
    }
    let config = this.goconfig()
    if (config) {
      options.env = config.environment(o)
    }
    if (!options.env) {
      options.env = process.env
    }
    return options
  }

  mapMessages (data, cwd, linterName) {
    let pattern = /^((#)\s(.*)?)|((.*?):(\d*?):((\d*?):)?\s((.*)?((\n\t.*)+)?))/img
    let messages = []
    let match
    while ((match = pattern.exec(data)) !== null) {
      let message = this.extractMessage(match, cwd, linterName)
      if (message) {
        messages.push(message)
      }
    }
    return messages
  }

  extractMessage (line, cwd, linterName) {
    if (!line) {
      return
    }
    if (line[2] && line[2] === '#') {
      // Found A Package Indicator, Skip For Now
      return
    }
    let filePath
    if (line[5] && line[5] !== '') {
      if (path.isAbsolute(line[5])) {
        filePath = line[5]
      } else {
        filePath = path.join(cwd, line[5])
      }
    }
    let row = line[6]
    let column = line[8]
    let text = line[9]
    let range
    if (column && column >= 0) {
      range = [[row - 1, column - 1], [row - 1, 1000]]
    } else {
      range = [[row - 1, 0], [row - 1, 1000]]
    }
    return { name: linterName, type: 'Error', row, column, text, filePath, range }
  }

  hasTests (p) {
    if (p.endsWith('_test.go')) {
      return true
    }
    let files = fs.readdirSync(path.dirname(p))
    for (let file of files) {
      if (file.endsWith('_test.go')) {
        return true
      }
    }
    return false
  }
}
export {Builder}
