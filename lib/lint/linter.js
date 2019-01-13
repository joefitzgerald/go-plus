// @flow

import argparser from 'yargs-parser/lib/tokenize-arg-string'
import path from 'path'
import { Range, TextEditor } from 'atom'
import { isValidEditor } from './../utils'

import type { Disposable, Point } from 'atom'
import type { GoConfig } from './../config/service'
import type { ExecutorOptions, ExecResult } from './../config/executor'

export type LinterV2Message = {
  name?: string,
  location: {
    file: string,
    position: Range
  },
  reference?: {
    file: string,
    position?: Point
  },
  url?: string,
  icon?: string,
  excerpt: string,
  severity: 'error' | 'warning' | 'info',
  solutions?: Array<
    | {
        title?: string,
        position: Range,
        priority?: number,
        currentText?: string,
        replaceWith: string
      }
    | {
        title?: string,
        priority?: number,
        apply: () => any
      }
  >,
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

class Linter {
  goconfig: GoConfig
  linter: () => LinterDelegate
  busySignal: () => ?BusySignalService
  disposed: boolean

  constructor(
    goconfig: GoConfig,
    linter: () => LinterDelegate,
    busySignal: () => ?BusySignalService
  ) {
    this.goconfig = goconfig
    this.linter = linter
    this.busySignal = busySignal
  }

  dispose() {
    this.disposed = true
  }

  deleteMessages() {
    const linter = this.linter()
    if (linter) {
      linter.clearMessages()
    }
  }

  setMessages(messages: Array<LinterV2Message>) {
    const linter = this.linter()
    if (linter && messages && messages.length) {
      linter.setAllMessages(messages)
    }
  }

  lint(editor: TextEditor): Promise<void> {
    const bs = this.busySignal()
    const lintPromise = this.doLint(editor)
    return bs
      ? bs.reportBusyWhile('Linting Go', () => lintPromise)
      : lintPromise
  }

  async doLint(editor: TextEditor): Promise<void> {
    if (!isValidEditor(editor)) {
      return
    }

    const buffer = editor.getBuffer()
    if (!buffer) {
      return
    }
    this.deleteMessages()

    const tool: string = (atom.config.get('go-plus.lint.tool'): any)
    const cmd = await this.goconfig.locator.findTool(tool)
    if (!cmd) {
      return
    }

    const options = this.goconfig.executor.getOptions('file', editor)

    let configuredArgs: string | string[] = (atom.config.get(
      'go-plus.lint.args'
    ): any)
    if (typeof configuredArgs === 'string') {
      configuredArgs = configuredArgs ? argparser(configuredArgs) : []
    }

    let args = TOOLS[tool.toLowerCase()].prepareArgs(configuredArgs)
    args = replaceVariables(args, editor.getPath(), options)

    const r: ExecResult = await this.goconfig.executor.exec(cmd, args, options)
    if (!r) {
      return
    }
    const stderr = r.stderr instanceof Buffer ? r.stderr.toString() : r.stderr
    const stdout = r.stdout instanceof Buffer ? r.stdout.toString() : r.stdout
    if (stderr && stderr.trim() !== '') {
      console.log(`${tool}-linter: (stderr) ` + stderr) // eslint-disable-line no-console
    }
    let messages: Array<LinterV2Message> = []
    if (stdout && stdout.trim() !== '') {
      messages = TOOLS[tool.toLowerCase()].mapMessages(
        stdout,
        editor,
        options.cwd || ''
      )

      messages.sort((a, b) => {
        if (a.location.file === b.location.file) {
          return a.location.position.compare(b.location.position)
        } else {
          return a.location.file.localeCompare(b.location.file)
        }
      })
    }
    this.setMessages(messages)
  }
}
export { Linter }

const regexVariable = /\${(.*?)}/g
function replaceVariables(
  args: string[],
  file: ?string,
  options: ExecutorOptions
): string[] {
  const workspaceFile = file && atom.project.relativizePath(file)
  const variables = {
    env: (options.env: any),
    cwd: options.cwd,
    file,
    fileBasename: file && path.basename(file),
    fileDirname: file && path.dirname(file),
    relativeFile: workspaceFile && workspaceFile[1],
    workspaceRoot: workspaceFile && workspaceFile[0]
  }
  return args.map(arg => {
    return arg.replace(regexVariable, (group, name) => {
      if (name.startsWith('env.')) {
        return variables.env[name.replace('env.', '')]
      }
      return variables[name]
    })
  })
}

type Tool = {
  prepareArgs(configuredArgs: string[]): string[],
  mapMessages(
    stdout: string,
    editor: TextEditor,
    cwd: string
  ): LinterV2Message[]
}

const TOOLS: { [string]: Tool } = {
  gometalinter: {
    prepareArgs(configuredArgs: string[]): string[] {
      let args = [...configuredArgs]
      if (!args.length) {
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
      if (!args.includes('--json')) {
        args.unshift('--json')
      }
      return args
    },
    mapMessages(
      stdout: string,
      editor: TextEditor,
      cwd: string
    ): Array<LinterV2Message> {
      let messages = []
      try {
        messages = JSON.parse(stdout)
      } catch (e) {
        console.log(e) // eslint-disable-line no-console
      }
      if (!messages || messages.length < 1) {
        return []
      }

      const results: Array<LinterV2Message> = []

      for (const message of messages) {
        let range
        if (message.col && message.col >= 0) {
          range = new Range(
            [message.line - 1, message.col - 1],
            [message.line - 1, 1000]
          )
        } else {
          range = new Range([message.line - 1, 0], [message.line - 1, 1000])
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
  },
  revive: {
    prepareArgs(configuredArgs: string[]): string[] {
      let args: string[] = ['--formatter=json']
      if (Array.isArray(configuredArgs) && configuredArgs.length > 0) {
        for (let i = 0; i < configuredArgs.length; i++) {
          const arg: string = (configuredArgs[i]: any)
          if (arg === '-formatter') {
            i++ // skip this and the following value
            continue
          }
          if (arg.startsWith('--formatter=')) {
            continue
          }
          args.push(arg)
        }
      }
      return args
    },
    mapMessages(
      stdout: string,
      editor: TextEditor,
      cwd: string
    ): Array<LinterV2Message> {
      let messages = []
      try {
        messages = JSON.parse(stdout)
      } catch (e) {
        console.log(e) // eslint-disable-line no-console
      }

      if (!messages || messages.length < 1) {
        return []
      }

      return messages.map(m => {
        const position = new Range(
          [m.Position.Start.Line - 1, m.Position.Start.Column - 1],
          [m.Position.End.Line - 1, m.Position.End.Column - 1]
        )

        const message: LinterV2Message = {
          location: {
            file: path.join(cwd, m.Position.Start.Filename),
            position
          },
          url: `https://revive.run/r#${m.RuleName}`,
          excerpt: `${m.Failure} (${m.RuleName})`,
          severity: m.Severity.toLowerCase(),
          linterName: 'revive'
        }

        if (m.ReplacementLine) {
          message.solutions = [
            {
              position: new Range(
                [position.start.row, 0],
                [position.start.row, 1000]
              ),
              replaceWith: m.ReplacementLine
            }
          ]
        }

        return message
      })
    }
  },
  'golangci-lint': {
    prepareArgs(configuredArgs: string[]): string[] {
      const args: string[] = ['run', '--out-format=json']
      if (Array.isArray(configuredArgs) && configuredArgs.length > 0) {
        for (let i = 0; i < configuredArgs.length; i++) {
          const arg: string = (configuredArgs[i]: any)
          if (arg.startsWith('--out-format')) {
            continue
          }
          args.push(arg)
        }
      }
      return args
    },
    mapMessages(
      stdout: string,
      editor: TextEditor,
      cwd: string
    ): Array<LinterV2Message> {
      let parsed
      try {
        parsed = JSON.parse(stdout)
      } catch (e) {
        console.log(e) // eslint-disable-line no-console
      }

      const issues = (parsed && parsed.Issues) || []
      if (issues.length < 1) {
        return []
      }

      return issues.map(i => {
        const position = new Range(
          [i.Pos.Line - 1, i.Pos.Column - 1],
          [i.Pos.Line - 1, 1000]
        )
        return {
          location: {
            file: path.join(cwd, i.Pos.Filename),
            position
          },
          excerpt: i.Text,
          severity: 'warning',
          linterName: i.FromLinter
        }
      })
    }
  }
}
