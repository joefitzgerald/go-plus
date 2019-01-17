// @flow

import argparser from 'yargs-parser/lib/tokenize-arg-string'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import temp from '@atom/temp'
import { CompositeDisposable, Range } from 'atom'
import { isValidEditor } from './../utils'
import { getgopath } from '../config/environment'

import type { GoConfig } from './../config/service'
import type { ExecutorOptions } from './../config/executor'
import type { LinterDelegate, LinterV2Message } from './../lint/linter'
import type { OutputManager } from './../output-manager'

class Builder {
  goconfig: GoConfig
  subscriptions: CompositeDisposable
  disposed: boolean
  linter: () => LinterDelegate
  output: OutputManager
  busySignal: () => ?BusySignalService

  constructor(
    goconfig: GoConfig,
    linter: () => LinterDelegate,
    output: OutputManager,
    busySignal: () => ?BusySignalService
  ) {
    this.goconfig = goconfig
    this.linter = linter
    this.output = output
    this.subscriptions = new CompositeDisposable()
    this.busySignal = busySignal

    temp.track()
  }

  dispose() {
    this.disposed = true
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    try {
      temp.cleanupSync()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('builder cleanup:', err)
    }
  }

  deleteMessages() {
    const linter = this.linter()
    if (linter) {
      linter.clearMessages()
    }
  }

  setMessages(messages: Array<Object>) {
    const linter = this.linter()
    if (linter && messages && messages.length) {
      linter.setAllMessages(messages)
    }
  }

  async build(editor: TextEditor, path: string): Promise<void> {
    if (!atom.config.get('go-plus.config.compileOnSave')) {
      return
    }
    if (!isValidEditor(editor)) {
      throw new Error('invalid editor')
    }
    this.deleteMessages()
    const options = this.goconfig.executor.getOptions('file', editor)
    options.timeout =
      (atom.config.get('go-plus.config.buildTimeout'): any) || 10000
    const cmd = await this.goconfig.locator.findTool('go')
    if (!cmd) {
      throw new Error('cannot find go tool')
    }
    const hasTests = this.hasTests(path)
    const promise = hasTests
      ? this.lintTest(cmd, options)
      : this.lintInstall(cmd, options)

    const bs = this.busySignal()
    const p = bs ? bs.reportBusyWhile('Building Go', () => promise) : promise
    const result = await p
    if (!result) {
      return
    }
    if (result.exitcode === 130) {
      return
    }
    this.setMessages(this.getMessages(result, options.cwd || ''))

    // check for any non-zero exit codes and error if found
    if (result.exitcode !== 0) {
      if (this.output) {
        if (result.exitcode === 124) {
          const tool = hasTests
            ? 'test'
            : this.buildCommand(getgopath(), options.cwd || '')
          let timeoutMsg = `go ${tool} timed out`
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
    // indicate that we're done, which is especially important when test on save is disabled
    // (we don't want to give the appearance that we're compiling indefinitely)
    if (this.output) {
      this.output.update({
        output: this.output.props.output + '\n\nDone'
      })
    }
  }

  getMessages(result: { output: string }, cwd: string): Array<LinterV2Message> {
    let messages: Array<LinterV2Message> = []
    const { output } = result
    const newMessages = this.mapMessages(output, cwd)
    for (const newMessage of newMessages) {
      if (!messages.some(message => this.messageEquals(newMessage, message))) {
        messages.push(newMessage)
      }
    }

    return messages
  }

  messageEquals(m1: LinterV2Message, m2: LinterV2Message): boolean {
    return (
      m1.location.file === m2.location.file &&
      m1.excerpt === m2.excerpt &&
      m1.location.position.isEqual(m2.location.position)
    )
  }

  buildCommand(gopath: string, cwd: string, sep: string = path.sep): string {
    if (gopath.endsWith(sep)) {
      gopath = gopath.slice(0, -1)
    }
    const srcDir = gopath + sep + 'src'
    return srcDir.split(sep).every((t, i) => cwd.split(sep)[i] === t)
      ? 'install' // CWD is within gopath, `go install` to keep gocode up to date
      : 'build' // CWD is outside gopath, `go build` will suffice
  }

  async lintInstall(cmd: string, options: ExecutorOptions) {
    const command = this.buildCommand(getgopath(), options.cwd || '')
    const buildArgs = [command]
    let outFile
    if (command === 'build') {
      outFile = this.outFile()
      buildArgs.push('-o')
      buildArgs.push(outFile)
    }
    const additionalArgs = atom.config.get('go-plus.config.additionalBuildArgs')
    if (additionalArgs && additionalArgs.length) {
      const parsed = argparser(additionalArgs)
      buildArgs.push(...parsed)
    }

    // Include the -i flag with go install.
    // See: https://github.com/mdempsky/gocode/issues/79
    if (command === 'install' && !buildArgs.includes('-i')) {
      buildArgs.push('-i')
    }

    buildArgs.push('.')
    this.output.update({
      output: 'Running go ' + buildArgs.join(' '),
      exitcode: 0
    })

    const r = await this.goconfig.executor.exec(cmd, buildArgs, {
      ...options,
      uniqueKey: 'lintInstall/' + (options.cwd || '')
    })
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    if (stdout && stdout.trim() !== '') {
      console.log('go ' + command + ': (stdout) ' + stdout) // eslint-disable-line no-console
    }
    let stderr = (r.stderr instanceof Buffer
      ? r.stderr.toString()
      : r.stderr
    ).trim()

    // cleanup any temp files
    if (outFile && outFile !== '/dev/null' && r.exitcode === 0) {
      fs.remove(outFile)
    }

    let exitcode = r.exitcode
    if (stderr.indexOf('no non-test Go files in') >= 0) {
      // pkgs may only contain go test files (e.g. integration tests)
      // ignore this error because the test builder reports the errors then.
      stderr = ''
      exitcode = 0
    }
    return { output: stderr, exitcode }
  }

  outFile(): string {
    if (process.platform === 'win32') {
      return temp.path({ prefix: 'go-plus-test' })
    }
    return '/dev/null'
  }

  testCompileArgs(outFile: string, additionalArgs: string = ''): Array<string> {
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
    result.push('-c', '-i', '-o', outFile, '.')
    return result
  }

  async lintTest(cmd: string, options: ExecutorOptions) {
    const outFile = this.outFile()
    const additionalArgs = (atom.config.get(
      'go-plus.config.additionalTestArgs'
    ): any)
    const testArgs = this.testCompileArgs(outFile, additionalArgs)

    this.output.update({
      output: 'Compiling tests:' + os.EOL + '$ go ' + testArgs.join(' '),
      exitcode: 0
    })
    const r = await this.goconfig.executor.exec(cmd, testArgs, {
      ...options,
      uniqueKey: 'lintTest/' + (options.cwd || '')
    })
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    if (stdout && stdout.trim() !== '') {
      console.log('go test: (stdout) ' + stdout) // eslint-disable-line no-console
    }
    if (outFile && outFile !== '/dev/null' && r.exitcode === 0) {
      fs.remove(outFile)
    }
    return { output: stderr.trim(), exitcode: r.exitcode }
  }

  mapMessages(data: string, cwd: string): Array<LinterV2Message> {
    const pattern = /^((#)\s(.*)?)|((.*?):(\d*?):((\d*?):)?\s((.*)?((\n\t.*)+)?))/gim
    const messages = []
    let match
    for (
      match = pattern.exec(data);
      match !== null;
      match = pattern.exec(data)
    ) {
      const message = this.extractMessage(match, cwd)
      if (message) {
        messages.push(message)
      }
    }
    return messages
  }

  extractMessage(line: Array<string>, cwd: string): ?LinterV2Message {
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
    return {
      severity: 'error',
      location: { file: filePath, position: range },
      excerpt: text
    }
  }

  hasTests(p: string): boolean {
    if (p.endsWith('_test.go')) {
      return true
    }
    const files = fs.readdirSync(path.dirname(p))
    return files.some(f => f.endsWith('_test.go'))
  }
}

export { Builder }
