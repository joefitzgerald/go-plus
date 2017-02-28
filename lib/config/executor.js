'use babel'

import {BufferedProcess} from 'atom'
import {spawnSync} from 'child_process'
import {getenvironment} from './environment'
import fs from 'fs-extra'
import path from 'path'
import {getEditor, projectPath} from '../utils'

class Executor {
  dispose () {
  }

  execSync (command, args = [], options) {
    options = this.getOptions(options)
    if (!args) {
      args = []
    }

    const done = spawnSync(command, args, options)
    let code = done.status

    let stdout = ''
    if (done.stdout && done.stdout.length > 0) {
      stdout = done.stdout
    }
    let stderr = ''
    if (done.stderr && done.stderr.length > 0) {
      stderr = done.stderr
    }
    let error = done.error
    if (error && error.code) {
      switch (error.code) {
        case 'ENOENT':
          code = 127
          break
        case 'ENOTCONN': // https://github.com/iojs/io.js/pull/1214
          error = null
          code = 0
          break
      }
    }

    return {exitcode: code, stdout: stdout, stderr: stderr, error: error}
  }

  exec (command, args = [], options) {
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
                code: 'ENOENT',
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

      const bufferedprocess = new BufferedProcess({command: command, args: args, options: options, stdout: stdoutFn, stderr: stderrFn, exit: exitFn})
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

  getOptions (options, editor = getEditor()) {
    if (!options || typeof options === 'string') {
      options = this.getDefaultOptions(options, editor)
    }
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
        console.log(e)
      }
    }
    return options
  }

  getDefaultOptions (key = 'file', editor = getEditor()) {
    const options = {}
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
