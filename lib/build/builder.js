'use babel'

import {CompositeDisposable, Range} from 'atom'
import fs from 'fs-extra'
import path from 'path'
import temp from 'temp'
import os from 'os'
import {isValidEditor} from './../utils'
import {getgopath} from '../config/environment'

class Builder {
  constructor (goconfig, linter, output) {
    this.goconfig = goconfig
    this.linter = linter
    this.output = output
    this.subscriptions = new CompositeDisposable()

    temp.track()
  }

  dispose () {
    this.disposed = true
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = null
    this.goconfig = null
  }

  deleteMessages () {
    const linter = this.linter()
    if (linter) {
      linter.deleteMessages()
    }
  }

  setMessages (messages) {
    const linter = this.linter()
    if (linter && messages && messages.length) {
      linter.setMessages(messages)
    }
  }

  build (editor, path = editor.getPath()) {
    if (!isValidEditor(editor)) {
      return Promise.reject(new Error('invalid editor'))
    }
    this.deleteMessages()
    const options = this.goconfig.executor.getOptions('file')
    return Promise.resolve().then(() => {
      return this.goconfig.locator.findTool('go').then((cmd) => {
        if (!cmd) {
          return Promise.reject(new Error('cannot find go tool'))
        }
        const buildPromise = this.lintInstall(cmd, options)
        const testPromise = this.hasTests(path)
          ? this.lintTest(cmd, options)
          : Promise.resolve({output: '', linterName: 'test', exitcode: 0})

        return Promise.all([buildPromise, testPromise])
      })
    }).then((results) => {
      if (results && results.length) {
        const messages = this.getMessages(results, options.cwd)
        this.setMessages(messages)
        for (const result of results) {
          if (result.exitcode !== 0) {
            if (this.output) {
              this.output.update({
                exitcode: result.exitcode,
                output: result.output,
                dir: options.cwd
              })
            }
            return Promise.reject(new Error(result.output))
          }
        }
        return Promise.resolve()
      }
    })
  }

  getMessages (results, cwd) {
    let messages = []
    for (const { output, linterName } of results) {
      const newMessages = this.mapMessages(output, cwd, linterName)
      for (const newMessage of newMessages) {
        if (!messages.some((message) => this.messageEquals(newMessage, message))) {
          messages.push(newMessage)
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
      m1.range.isEqual(m2.range)
  }

  buildCommand (gopath, cwd, sep = path.sep) {
    const srcDir = gopath + sep + 'src'
    return srcDir.split(sep).every((t, i) => cwd.split(sep)[i] === t)
      ? 'install' // CWD is within gopath, `go install` to keep gocode up to date
      : 'build'   // CWD is outside gopath, `go build` will suffice
  }

  lintInstall (cmd, options) {
    const command = this.buildCommand(getgopath(), options.cwd)
    const buildArgs = [command, '.']
    return new Promise((resolve, reject) => {
      this.output.update({
        output: 'Running go ' + buildArgs.join(' '),
        exitcode: 0
      })
      this.goconfig.executor.exec(cmd, buildArgs, options).then((r) => {
        if (r.stdout && r.stdout.trim() !== '') {
          console.log('go ' + command + ': (stdout) ' + r.stdout)
        }
        resolve({ output: r.stderr.trim(), linterName: 'build', exitcode: r.exitcode })
      })
    })
  }

  lintTest (cmd, options) {
    const tempdir = fs.realpathSync(temp.mkdirSync())
    const tempfile = path.join(tempdir, 'go-plus-test')
    const testArgs = ['test', '-c', '-i', '-o', tempfile, '.']
    return new Promise((resolve, reject) => {
      this.output.update({
        output: 'Compiling tests:' + os.EOL + '$ go ' + testArgs.join(' '),
        exitcode: 0
      })
      this.goconfig.executor.exec(cmd, testArgs, options).then((r) => {
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
        resolve({ output: r.stderr.trim(), linterName: 'test', exitcode: r.exitcode })
      })
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
      range = new Range([row - 1, column - 1], [row - 1, 1000])
    } else {
      range = new Range([row - 1, 0], [row - 1, 1000])
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
