// @flow
'use babel'

import {BufferedProcess} from 'atom'
import {spawnSync} from 'child_process'
import {getenvironment} from './environment'
import fs from 'fs-extra'
import path from 'path'
import {getEditor, projectPath} from '../utils'

type Options = {
  timeout?: number,
  encoding?: string,
  env?: any, // TODO
  cwd?: string,
  input?: string
}

export type ExecutorOptions = string | ?Options

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
  dispose () {
  }

  execSync (command: string, args?: Array<string> = [], options: ExecutorOptions): ExecResult {
    const opt: any = this.getOptions(options)
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
    if (done.error && done.error.code) {
      switch (done.error.code) {
        case 'ENOENT':
          err.code = 127
          break
        case 'ENOTCONN': // https://github.com/iojs/io.js/pull/1214
          err = null
          code = 0
          break
      }
    }

    return {exitcode: code, stdout: stdout, stderr: stderr, error: err}
  }

  exec (command: string, args: Array<string> = [], options: ExecutorOptions): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      options = this.getOptions(options)
      if (!args) {
        args = []
      }

      let verbose = false
      if (process.env.GOPLUSDEV || atom.config.get('go-plus.devMode')) {
        verbose = true // Warning, this will get very verbose when typing
      }
      if (verbose) {
        console.log('executing: ' + command + ' ' + args.join(' '))
      }

      let stdout = ''
      let stderr = ''
      const stdoutFn = (data) => { stdout += data }
      const stderrFn = (data) => { stderr += data }
      const exitFn = (code) => {
        if (verbose) {
          console.log('exited with code: ' + code)
          console.log('stderr: ' + stderr)
          console.log('stdout: ' + stdout)
        }
        if (stderr) {
          const nonexistentcommand = "'" + command + "' is not recognized as an internal or external command,operable program or batch file."
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
        options: options,
        stdout: stdoutFn,
        stderr: stderrFn,
        exit: exitFn
      })

      setTimeout(() => {
        bufferedprocess.kill()
        resolve({
          error: null,
          exitcode: 124,
          stdout: stdout,
          stderr: stderr
        })
      }, options.timeout)
      bufferedprocess.onWillThrowError((err) => {
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

      if (options.input && options.input.length > 0) {
        bufferedprocess.process.stdin.end(options.input)
      }
    })
  }

  getOptions (options: ExecutorOptions, editor: any = getEditor()): Options {
    let result: Options = {}
    if (!options) {
      options = 'file'
    }
    if (options === 'file' || options === 'project') {
      result = this.getDefaultOptions(options, editor)
    }
    if (!result.timeout) {
      result.timeout = 10000
    }
    result.encoding = 'utf8'
    if (!result.env) {
      result.env = getenvironment()
    }
    if (result.cwd && result.cwd.length > 0) {
      try {
        result.cwd = fs.realpathSync(result.cwd)
      } catch (e) {
        if (e.handle) {
          e.handle()
        }
        console.log(e)
      }
    }
    return result
  }

  getDefaultOptions (key: 'file' | 'project' = 'file', editor: any = getEditor()): Options {
    let options = {}
    switch (key) {
      case 'file':
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

      case 'project':
        const p = projectPath()
        if (p) {
          options.cwd = p
        }
        break

      default:
        throw new Error('Unknown executor option "' + key + '"')
    }
    return options
  }
}

export {Executor}
