{exec} = require 'child_process'
{BufferedProcess} = require 'atom'

module.exports =
class Executor

  exec: (command, cwd, env, callback, args) =>
    output = ''
    error = ''
    code = 0
    messages = []
    options =
      cwd: null
      env: null
    options.cwd = cwd if cwd? and cwd isnt '' and cwd isnt false
    options.env = env if env?
    options.env = process.env unless options.env?
    stdout = (data) -> output += data
    stderr = (data) -> error += data
    exit = (data) ->
      console.log output
      console.log error
      console.log data
      console.log error.replace(/\r?\n|\r/g, '') is "\'\"" + command + "\"\' is not recognized as an internal or external command,operable program or batch file."
      if error? and error isnt '' and error.replace(/\r?\n|\r/g, '') is "\'\"" + command + "\"\' is not recognized as an internal or external command,operable program or batch file."
        message =
            line: false
            column: false
            msg: 'No file or directory: [' + command + ']'
            type: 'error'
            source: 'executor'
        messages.push message
        callback(127, output, error, messages)
        return
      code = data
      callback(code, output, error, messages)
    args = [] unless args?
    console.log command
    console.log args
    console.log options
    bufferedprocess = new BufferedProcess({command, args, options, stdout, stderr, exit})
    bufferedprocess.process.on 'error', (err) =>
      if err.code is 'ENOENT'
        message =
            line: false
            column: false
            msg: 'No file or directory: [' + command + ']'
            type: 'error'
            source: 'executor'
        messages.push message
      #else
      console.log err

      callback(127, output, error, messages)
