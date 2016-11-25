'use babel'

import {BufferedProcess} from 'atom'
import {spawnSync} from 'child_process'
import {getenvironment} from './environment'
import fs from 'fs-plus'

class Executor {
  dispose () {
  }

  execSync (command, args = [], options = {}) {
    options = !options ? {} : options
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

  exec (command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      options = !options ? {} : options
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
      if (!args) {
        args = []
      }

      let stdout = ''
      let stderr = ''
      const stdoutFn = (data) => { stdout += data }
      const stderrFn = (data) => { stderr += data }
      const exitFn = (code) => {
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
      if (!args) {
        args = []
      }

      const bufferedprocess = new BufferedProcess({command: command, args: args, options: options, stdout: stdoutFn, stderr: stderrFn, exit: exitFn})
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
}

export {Executor}
