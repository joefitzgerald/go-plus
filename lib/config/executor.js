// @flow

import { BufferedProcess } from 'atom'
import { spawnSync } from 'child_process'
import { getenvironment } from './environment'
import fs from 'fs-extra'
import path from 'path'
import { projectPath } from '../utils'

export type ExecutorOptions = {
  timeout?: number,
  encoding?: string,
  env?: { [string]: ?string },
  cwd?: string,
  input?: string
}

export type ExecResult = {
  error: ?{
    code: number,
    errno?: string,
    message?: string,
    path: string
  },
  exitcode: number,
  stdout: string | Buffer,
  stderr: string | Buffer
}

class Executor {
  getConsole: () => ?ConsoleApi

  constructor(getConsole: () => ?ConsoleApi) {
    this.getConsole = getConsole
  }

  dispose() {}

  execSync(
    command: string,
    args?: Array<string> = [],
    options: ExecutorOptions
  ): ExecResult {
    const opt: any = this.ensureOptions(options)
    const done = spawnSync(command, args, opt)

    let code = done.status
    let stdout = ''
    if (done.stdout && done.stdout.length > 0) {
      stdout = done.stdout
    }
    let stderr = ''
    if (done.stderr && done.stderr.length > 0) {
      stderr = done.stderr
    }

    let err: any = done.error
    if (err) {
      if (err.code) {
        switch (err.code) {
          case 'ENOENT':
            code = 127
            break
          case 'ENOTCONN': // https://github.com/iojs/io.js/pull/1214
            err = null
            code = 0
            break
        }
      }
    }

    return { exitcode: code, stdout: stdout, stderr: stderr, error: err }
  }

  exec(
    command: string,
    args: Array<string> = [],
    options: ExecutorOptions
  ): Promise<ExecResult> {
    return new Promise(resolve => {
      const opt: any = this.ensureOptions(options)
      if (!args) {
        args = []
      }

      let verbose = false
      if (process.env.GOPLUSDEV || atom.config.get('go-plus.devMode')) {
        verbose = true // Warning, this will get very verbose when typing
      }
      if (verbose) {
        console.log('executing: ' + command + ' ' + args.join(' ')) // eslint-disable-line no-console
      }

      let stdout = ''
      let stderr = ''
      const stdoutFn = data => {
        stdout += data
      }
      const stderrFn = data => {
        stderr += data
      }

      let timeoutId: TimeoutID
      const exitFn = code => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (verbose) {
          /* eslint-disable no-console */
          console.log('exited with code: ' + code)
          console.log('stderr: ' + stderr)
          console.log('stdout: ' + stdout)
          /* eslint-enable no-console */
        }
        if (stderr) {
          const nonexistentcommand =
            "'" +
            command +
            "' is not recognized as an internal or external command,operable program or batch file."
          if (stderr.replace(/\r?\n|\r/g, '') === nonexistentcommand) {
            resolve({
              error: {
                code: 3025,
                errno: 'ENOENT',
                message: 'spawn ' + command + ' ENOENT',
                path: command
              },
              exitcode: 127,
              stdout: stdout,
              stderr: stderr
            })
            return
          }
        }

        if (code !== 0) {
          const console = this.getConsole()
          if (console) {
            console.error(
              `${command} ${args.join(' ')} failed with exit code ${code}.`
            )
            console.warn(`${command} stderr: ${stderr}`)
          }
        }
        resolve({
          error: null,
          exitcode: code,
          stdout: stdout,
          stderr: stderr
        })
      }

      const bufferedprocess = new BufferedProcess({
        command: command,
        args: args,
        options: opt,
        stdout: stdoutFn,
        stderr: stderrFn,
        exit: exitFn
      })

      if (options.timeout && options.timeout > 0) {
        timeoutId = setTimeout(() => {
          bufferedprocess.kill()
          resolve({
            error: null,
            exitcode: 124,
            stdout: stdout,
            stderr: stderr
          })
        }, options.timeout)
      }
      bufferedprocess.onWillThrowError(err => {
        let e = err
        if (err) {
          if (err.handle) {
            err.handle()
          }
          if (err.error) {
            e = err.error
          }
        }
        resolve({
          error: e,
          exitcode: 127,
          stdout: stdout,
          stderr: stderr
        })
      })

      if (opt.input && opt.input.length > 0) {
        bufferedprocess.process.stdin.end(opt.input)
      }
    })
  }

  getOptions(
    kind: 'file' | 'project' = 'file',
    editor?: ?atom$TextEditor
  ): ExecutorOptions {
    const result: ExecutorOptions = this.getDefaultOptions(kind, editor)
    return this.ensureOptions(result)
  }

  ensureOptions(options: ExecutorOptions): ExecutorOptions {
    if (!options.timeout) {
      options.timeout = 10000
    }
    options.encoding = 'utf8'
    if (!options.env) {
      options.env = getenvironment()
    }
    if (options.cwd && options.cwd.length > 0) {
      try {
        options.cwd = fs.realpathSync(options.cwd)
      } catch (e) {
        if (e.handle) {
          e.handle()
        }
        console.log(e) // eslint-disable-line no-console
      }
    }
    return options
  }

  getDefaultOptions(
    key: 'file' | 'project' = 'file',
    editor?: ?atom$TextEditor
  ): ExecutorOptions {
    let options = {}
    switch (key) {
      case 'file': {
        let file = editor && editor.getPath()
        if (file) {
          options.cwd = path.dirname(file)
        }
        if (!options.cwd) {
          const p = projectPath()
          if (p) {
            options.cwd = p
          }
        }
        break
      }
      case 'project': {
        const p = projectPath()
        if (p) {
          options.cwd = p
        }
        break
      }
      default:
        throw new Error('Unknown executor option "' + key + '"')
    }
    return options
  }
}

export { Executor }
