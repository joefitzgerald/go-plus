// @flow

import argparser from 'yargs-parser/lib/tokenize-arg-string'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import temp from 'temp'
import {CompositeDisposable, Range} from 'atom'
import {isValidEditor} from './../utils'
import {getgopath} from '../config/environment'

import type {GoConfig} from './../config/service'
import type {ExecutorOptions} from './../config/executor'
import type {LinterDelegate, LinterV2Message} from './../lint/linter'
import type {OutputManager} from './../output-manager'

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

  async build (editor: any, path: string = editor.getPath()): Promise<any> {
    if (!atom.config.get('go-plus.config.compileOnSave')) {
      return
    }
    if (!isValidEditor(editor)) {
      throw new Error('invalid editor')
    }
    this.deleteMessages()
    const options = this.goconfig.executor.getOptions('file')
    const cmd = await this.goconfig.locator.findTool('go')
    if (!cmd) {
      throw new Error('cannot find go tool')
    }
    const buildPromise = this.lintInstall(cmd, options)
    const testPromise = this.hasTests(path)
      ? this.lintTest(cmd, options)
      : Promise.resolve({output: '', linterName: 'test', exitcode: 0})

    const results = await Promise.all([buildPromise, testPromise])
    if (!results || results.length === 0) {
      return
    }
    this.setMessages(this.getMessages(results, options.cwd || ''))

    // check for any non-zero exit codes and error if found
    for (const result of results) {
      if (result.exitcode !== 0) {
        if (this.output) {
          if (result.exitcode === 124) {
            let timeoutMsg = `${result.linterName} timed out`
            if (options.timeout) {
              timeoutMsg += ` after ${options.timeout} ms`
            }
            this.output.update({
              exitcode: result.exitcode,
              output: timeoutMsg,
              dir: options.cwd
            })
          } else {
            this.output.update({
              exitcode: result.exitcode,
              output: result.output,
              dir: options.cwd
            })
          }
        }
        throw new Error(result.output)
      }
    }
    // indicate that we're done, which is especially important when test on save is disabled
    // (we don't want to give the appearance that we're compiling indefinitely)
    if (this.output) {
      this.output.update({
        output: this.output.props.output + '\n\nDone'
      })
    }
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

  async lintInstall (cmd: string, options: ExecutorOptions) {
    const command = this.buildCommand(getgopath(), options.cwd || '')
    const buildArgs = [command]
    if (command === 'build') {
      buildArgs.push('-o')
      buildArgs.push(this.devNull())
    }
    const additionalArgs = atom.config.get('go-plus.config.additionalBuildArgs')
    if (additionalArgs && additionalArgs.length) {
      const parsed = argparser(additionalArgs)
      buildArgs.push(...parsed)
    }

    buildArgs.push('.')
    this.output.update({
      output: 'Running go ' + buildArgs.join(' '),
      exitcode: 0
    })
    const r = await this.goconfig.executor.exec(cmd, buildArgs, options)
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    if (stdout && stdout.trim() !== '') {
      console.log('go ' + command + ': (stdout) ' + stdout)
    }
    let stderr = (r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr).trim()
    let exitcode = r.exitcode
    if (stderr.indexOf('no non-test Go files in') >= 0) {
      // pkgs may only contain go test files (e.g. integration tests)
      // ignore this error because the test builder reports the errors then.
      stderr = ''
      exitcode = 0
    }
    return { output: stderr, linterName: 'build', exitcode }
  }

  devNull (): string {
    return process.platform === 'win32' ? 'NUL' : '/dev/null'
  }

  testCompileArgs (additionalArgs: string = ''): Array<string> {
    const result = ['test']
    // use additional build args even when we compile the tests
    if (additionalArgs && additionalArgs.length) {
      const parsed = argparser(additionalArgs)
      for (let i = 0; i < parsed.length; i++) {
        if (parsed[i] === '-o') {
          // we'll take care of this one, skip over the -o flag
          i++
          continue
        } else if (parsed[i] === '-c' || parsed[i] === '-i') {
          continue
        } else {
          result.push(parsed[i])
        }
      }
    }
    result.push('-c', '-i', '-o', this.devNull(), '.')
    return result
  }

  async lintTest (cmd: string, options: ExecutorOptions) {
    const testArgs = this.testCompileArgs(atom.config.get('go-plus.config.additionalBuildArgs'))

    this.output.update({
      output: 'Compiling tests:' + os.EOL + '$ go ' + testArgs.join(' '),
      exitcode: 0
    })
    const r = await this.goconfig.executor.exec(cmd, testArgs, options)
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    if (stdout && stdout.trim() !== '') {
      console.log('go test: (stdout) ' + stdout)
    }
    return { output: stderr.trim(), linterName: 'test', exitcode: r.exitcode }
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
