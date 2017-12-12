// @flow
'use babel'

import {CompositeDisposable, Range} from 'atom'
import fs from 'fs-extra'
import path from 'path'
import temp from 'temp'
import os from 'os'
import {isValidEditor} from './../utils'
import {getgopath} from '../config/environment'

import type {GoConfig} from './../config/service'
import type {ExecutorOptions} from './../config/executor'
import type {LinterDelegate, LinterV2Message} from './../lint/linter'
import type OutputManager from './../output-manager'

class Builder {
  goconfig: GoConfig
  subscriptions: CompositeDisposable
  disposed: bool
  linter: () => LinterDelegate
  output: OutputManager

  constructor (goconfig: GoConfig, linter: () => LinterDelegate, output: OutputManager) {
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
  }

  deleteMessages () {
    const linter = this.linter()
    if (linter) {
      linter.clearMessages()
    }
  }

  setMessages (messages: Array<Object>) {
    const linter = this.linter()
    if (linter && messages && messages.length) {
      linter.setAllMessages(messages)
    }
  }

  build (editor: any, path: string = editor.getPath()): Promise<any> {
    const that = this
    return new Promise((resolve, reject) => {
      if (!isValidEditor(editor)) {
        reject(new Error('invalid editor'))
        return
      }

      that.deleteMessages()
      const options = that.goconfig.executor.getOptions('file')
      return that.goconfig.locator.findTool('go').then((cmd) => {
        if (!cmd) {
          reject(new Error('cannot find go tool'))
          return
        }
        const buildPromise = that.lintInstall(cmd, options)
        const testPromise = that.hasTests(path)
          ? that.lintTest(cmd, options)
          : Promise.resolve({output: '', linterName: 'test', exitcode: 0})

        return Promise.all([buildPromise, testPromise])
      }).then((results) => {
        if (results && results.length) {
          const messages = that.getMessages(results, options.cwd || '')
          that.setMessages(messages)
          for (const result of results) {
            if (result.exitcode !== 0) {
              if (that.output) {
                if (result.exitcode === 124) {
                  let timeoutMsg = `${result.linterName} timed out`
                  if (options.timeout) {
                    timeoutMsg += ` after ${options.timeout} ms`
                  }
                  that.output.update({
                    exitcode: result.exitcode,
                    output: timeoutMsg,
                    dir: options.cwd
                  })
                } else {
                  that.output.update({
                    exitcode: result.exitcode,
                    output: result.output,
                    dir: options.cwd
                  })
                }
              }
              reject(new Error(result.output))
              return
            }
          }
          return resolve()
        }
      })
    })
  }

  getMessages (results: Array<{output: string, linterName: string}>, cwd: string): Array<LinterV2Message> {
    let messages: Array<LinterV2Message> = []
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
      if (message.name) {
        message.excerpt += ' (' + message.name + ')'
      }
    }
    return messages
  }

  messageEquals (m1: LinterV2Message, m2: LinterV2Message): bool {
    return m1.location.file === m2.location.file &&
      m1.excerpt === m2.excerpt &&
      m1.location.position.isEqual(m2.location.position)
  }

  buildCommand (gopath: string, cwd: string, sep: string = path.sep): string {
    if (gopath.endsWith(sep)) {
      gopath = gopath.slice(0, -1)
    }
    const srcDir = gopath + sep + 'src'
    return srcDir.split(sep).every((t, i) => cwd.split(sep)[i] === t)
      ? 'install' // CWD is within gopath, `go install` to keep gocode up to date
      : 'build' // CWD is outside gopath, `go build` will suffice
  }

  lintInstall (cmd: string, options: ExecutorOptions) {
    const command = this.buildCommand(getgopath(), options.cwd || '')
    const buildArgs = [command]
    if (command === 'build') {
      buildArgs.push('-o')
      buildArgs.push(this.devNull())
    }
    buildArgs.push('.')
    this.output.update({
      output: 'Running go ' + buildArgs.join(' '),
      exitcode: 0
    })
    return this.goconfig.executor.exec(cmd, buildArgs, options).then((r) => {
      const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
      if (stdout && stdout.trim() !== '') {
        console.log('go ' + command + ': (stdout) ' + stdout)
      }
      const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
      return { output: stderr.trim(), linterName: 'build', exitcode: r.exitcode }
    })
  }

  devNull (): string {
    return process.platform === 'win32' ? 'NUL' : '/dev/null'
  }

  lintTest (cmd: string, options: ExecutorOptions) {
    const testArgs = ['test', '-c', '-i', '-o', this.devNull(), '.']

    this.output.update({
      output: 'Compiling tests:' + os.EOL + '$ go ' + testArgs.join(' '),
      exitcode: 0
    })
    return this.goconfig.executor.exec(cmd, testArgs, options).then((r) => {
      const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
      const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
      if (stdout && stdout.trim() !== '') {
        console.log('go test: (stdout) ' + stdout)
      }
      return { output: stderr.trim(), linterName: 'test', exitcode: r.exitcode }
    })
  }

  mapMessages (data: string, cwd: string, linterName: string): Array<LinterV2Message> {
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

  extractMessage (line: Array<string>, cwd: string, linterName: string): ?LinterV2Message {
    if (!line) {
      return
    }
    if (line[2] && line[2] === '#') {
      // Found A Package Indicator, Skip For Now
      return
    }
    let filePath = ''
    if (line[5] && line[5] !== '') {
      if (path.isAbsolute(line[5])) {
        filePath = line[5]
      } else {
        filePath = path.join(cwd, line[5])
      }
    }
    const row = parseInt(line[6])
    const column = parseInt(line[8])
    const text = line[9]
    let range
    if (column && column >= 0) {
      range = new Range([row - 1, column - 1], [row - 1, 1000])
    } else {
      range = new Range([row - 1, 0], [row - 1, 1000])
    }
    return { name: linterName, severity: 'error', location: { file: filePath, position: range }, excerpt: text }
  }

  hasTests (p: string): bool {
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
