'use babel'

import {CompositeDisposable} from 'atom'
import fs from 'fs-extra'
import path from 'path'
import temp from 'temp'

class Builder {
  constructor (goconfig) {
    this.goconfig = goconfig
    this.subscriptions = new CompositeDisposable()

    this.name = 'go build'
    this.grammarScopes = ['source.go']
    this.scope = 'project'
    this.lintOnFly = false
    temp.track()
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
    const p = editor.getPath()
    if (!p) {
      return []
    }
    return Promise.resolve().then(() => {
      return this.goconfig.locator.findTool('go').then((cmd) => {
        if (!cmd) {
          return []
        }

        const options = this.goconfig.executor.getOptions('file')
        const buildPromise = this.lintInstall(cmd, options)

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
    for (const { output, linterName } of results) {
      const newMessages = this.mapMessages(output, cwd, linterName)
      for (const newMessage of newMessages) {
        if (!messages.some((message) => this.messageEquals(newMessage, message))) {
          messages = messages.concat(newMessage)
        }
      }
    }
    // add the "(<name>)" postfix to each message
    for (const message of messages) {
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
    const buildArgs = ['install', '.']
    return this.goconfig.executor.exec(cmd, buildArgs, options).then((r) => {
      if (r.stdout && r.stdout.trim() !== '') {
        console.log('go install: (stdout) ' + r.stdout)
      }
      return { output: r.stderr.trim(), linterName: 'build' }
    }).catch((e) => {
      console.log(e)
      return { output: '', linterName: 'build' }
    })
  }

  lintTest (cmd, options) {
    const tempdir = fs.realpathSync(temp.mkdirSync())
    const testArgs = ['test', '-c', '-i', '-o', tempdir, '.']
    return this.goconfig.executor.exec(cmd, testArgs, options).then((r) => {
      if (r.stdout && r.stdout.trim() !== '') {
        console.log('go test: (stdout) ' + r.stdout)
      }
      fs.remove(tempdir, (e) => {
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

  mapMessages (data, cwd, linterName) {
    const pattern = /^((#)\s(.*)?)|((.*?):(\d*?):((\d*?):)?\s((.*)?((\n\t.*)+)?))/img
    const messages = []
    let match
    while ((match = pattern.exec(data)) !== null) {
      const message = this.extractMessage(match, cwd, linterName)
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
    const row = line[6]
    const column = line[8]
    const text = line[9]
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
    const files = fs.readdirSync(path.dirname(p))
    for (const file of files) {
      if (file.endsWith('_test.go')) {
        return true
      }
    }
    return false
  }
}
export {Builder}
