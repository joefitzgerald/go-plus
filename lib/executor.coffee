{spawnSync} = require('child_process')
{BufferedProcess} = require('atom')
fs = require('fs-plus')

module.exports =
class Executor
  constructor: (environment) ->
    @environment = environment

  execSync: (command, cwd, env, args, input = null) =>
    options =
      cwd: null
      env: null
      encoding: 'utf8'
    options.cwd = fs.realpathSync(cwd) if cwd? and cwd isnt '' and cwd isnt false and fs.existsSync(cwd)
    options.env = if env? then env else @environment
    if input
      options.input = input
    args = [] unless args?
    done = spawnSync(command, args, options)
    result =
      error: done?.error
      code: done?.status
      stdout: if done?.stdout? then done.stdout else ''
      stderr: if done?.stderr? then done.stderr else ''
      messages: []
    if done.error?
      if done.error.code is 'ENOENT'
        message =
            line: false
            column: false
            msg: 'No file or directory: [' + command + ']'
            type: 'error'
            source: 'executor'
        result.messages.push(message)
        result.code = 127
      else if done.error.code is 'ENOTCONN' # https://github.com/iojs/io.js/pull/1214
        result.error = null
        result.code = 0
      else
        console.log('Error: ' + JSON.stringify(done.error))

    return result

  exec: (command, cwd, env, callback, args, input = null) =>
    output = ''
    error = ''
    code = 0
    messages = []
    options =
      cwd: null
      env: null
    options.cwd = fs.realpathSync(cwd) if cwd? and cwd isnt '' and cwd isnt false and fs.existsSync(cwd)
    options.env = if env? then env else @environment
    stdout = (data) -> output += data
    stderr = (data) -> error += data
    exit = (data) ->
      if error? and error isnt '' and error.replace(/\r?\n|\r/g, '') is "\'" + command + "\' is not recognized as an internal or external command,operable program or batch file."
        message =
            line: false
            column: false
            msg: 'No file or directory: [' + command + ']'
            type: 'error'
            source: 'executor'
        messages.push(message)
        callback(127, output, error, messages)
        return
      code = data
      callback(code, output, error, messages)
    args = [] unless args?

    bufferedprocess = new BufferedProcess({command, args, options, stdout, stderr, exit})
    bufferedprocess.onWillThrowError (err) ->
      return unless err?
      if err.error.code is 'ENOENT'
        message =
            line: false
            column: false
            msg: 'No file or directory: [' + command + ']'
            type: 'error'
            source: 'executor'
        messages.push(message)
      else
        console.log 'Error: ' + JSON.stringify(err.error)
      err.handle()
      callback(127, output, error, messages)

    if input?
      bufferedprocess.process.stdin.end(input)
