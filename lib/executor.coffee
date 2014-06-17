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
    options.cwd = cwd if cwd? and cwd isnt ''
    options.env = env if env?
    options.env = process.env unless options.env?
    stdout = (data) -> output += data
    stderr = (data) -> error += data
    exit = (data) ->
      code = data
      # console.log '[' + command + '] exited with code: ' + code if code isnt 0
      callback(code, output, error, messages)
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
      else
        console.log err
      callback(127, output, error, messages)
